// supabase/functions/pix-webhook/index.ts
// POST endpoint for Mercado Pago webhook callbacks

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHmac, timingSafeEqual } from 'https://deno.land/std@0.168.0/node/crypto.ts'

const VERIFY_TOKEN = Deno.env.get('MP_WEBHOOK_VERIFY_TOKEN') ?? ''
const MP_WEBHOOK_SECRET = Deno.env.get('MP_WEBHOOK_SECRET') ?? ''

/**
 * Validate Mercado Pago webhook signature
 * Mercado Pago signs notifications using HMAC-SHA256
 * Signature format: sha256=base64(hmac_sha256(webhook_id + "." + body, secret))
 */
async function _validateSignature(req: Request, payload: { id: string }): Promise<boolean> {
  const signature = req.headers.get('X-Signature')
  if (!signature || !MP_WEBHOOK_SECRET) {
    return false
  }

  const bodyStr = JSON.stringify(payload)
  const dataToSign = `${payload.id}.${bodyStr}`

  const hmac = createHmac('sha256', MP_WEBHOOK_SECRET)
  hmac.update(dataToSign)
  const expectedSignature = `sha256=${hmac.digest('base64')}`

  try {
    const sigBuffer = new TextEncoder().encode(signature)
    const expectedBuffer = new TextEncoder().encode(expectedSignature)
    if (sigBuffer.length !== expectedBuffer.length) {
      return false
    }
    return timingSafeEqual(sigBuffer, expectedBuffer)
  } catch {
    return false
  }
}

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  // Handle Mercado Pago webhook verification (GET request with challenge)
  const url = new URL(req.url)
  const token = url.searchParams.get('hub.verify_token')
  const challenge = url.searchParams.get('hub.challenge')

  if (token === VERIFY_TOKEN && challenge) {
    return new Response(challenge, { status: 200 })
  }

  let payload: { id: string; type: string; data: { id: string } }
  try {
    payload = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 400,
    })
  }

  const { id: eventId, type, data } = payload

  if (type !== 'payment' || !data?.id) {
    return new Response(JSON.stringify({ status: 'ignored' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  }

  const paymentId = data.id

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Idempotency check: skip if event already processed
  const { data: existingEvent } = await supabase
    .from('webhook_events')
    .select('id')
    .eq('id', eventId)
    .single()

  if (existingEvent) {
    return new Response(JSON.stringify({ status: 'duplicate' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  }

  // Mark event as processed
  await supabase
    .from('webhook_events')
    .insert({ id: eventId, event_type: type })

  // Fetch payment details from Mercado Pago
  const mpAccessToken = Deno.env.get('MP_ACCESS_TOKEN')!
  const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: {
      Authorization: `Bearer ${mpAccessToken}`,
      'Content-Type': 'application/json',
    },
  })
  const paymentData = await mpResponse.json()

  if (!mpResponse.ok) {
    console.error('Mercado Pago API error:', paymentData.message)
    return new Response(JSON.stringify({ error: 'Mercado Pago API error' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    })
  }

  const { status, metadata } = paymentData
  const orderId = metadata?.order_id

  if (!orderId) {
    return new Response(JSON.stringify({ error: 'Missing order_id in payment metadata' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 400,
    })
  }

  // Map payment status to order status
  const statusMap: Record<string, string> = {
    approved: 'paid',
    pending: 'pending_payment',
    processing: 'processing',
    rejected: 'payment_failed',
    cancelled: 'payment_failed',
    refunded: 'refunded',
  }

  const orderStatus = statusMap[status] ?? 'pending_payment'

  // Update order in database
  const { error: updateError } = await supabase
    .from('orders')
    .update({ status: orderStatus })
    .eq('id', orderId)

  if (updateError) {
    console.error('Error updating order:', updateError)
    throw updateError
  }

  // Update payment_intents table if exists
  const intentStatus = status === 'approved' ? 'succeeded'
    : status === 'pending' ? 'pending'
    : status === 'rejected' || status === 'cancelled' ? 'failed' : 'pending'

  await supabase
    .from('payment_intents')
    .update({ status: intentStatus })
    .eq('order_id', orderId)

  // Broadcast event via Supabase Realtime so connected clients update in real-time
  // Uses same 'orders' channel and 'order_updated' event as admin order status route
  try {
    const realtimeChannel = supabase.channel('orders')
    await realtimeChannel.send({
      type: 'broadcast',
      event: 'order_updated',
      payload: {
        order_id: orderId,
        status: orderStatus,
        updated_at: new Date().toISOString(),
        updated_by: 'system',
        payment_id: String(paymentId),
      },
    })
    await supabase.removeChannel(realtimeChannel)
  } catch (broadcastErr) {
    console.warn('Failed to broadcast realtime event:', broadcastErr)
  }

  return new Response(JSON.stringify({ status: 'success' }), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  })
})
