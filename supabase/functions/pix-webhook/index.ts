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
async function validateSignature(req: Request, payload: { id: string }): Promise<boolean> {
  const signature = req.headers.get('X-Signature')
  if (!signature || !MP_WEBHOOK_SECRET) {
    return false
  }

  // Get raw body for signature verification
  const bodyStr = JSON.stringify(payload)
  const dataToSign = `${payload.id}.${bodyStr}`

  // Compute expected signature
  const hmac = createHmac('sha256', MP_WEBHOOK_SECRET)
  hmac.update(dataToSign)
  const expectedSignature = `sha256=${hmac.digest('base64')}`

  // Constant-time comparison to prevent timing attacks
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

serve(async (req) => {
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

  // Parse webhook payload
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

  // Validate signature for payment notifications
  if (type === 'payment' && data?.id) {
    const isValid = await validateSignature(req, payload)
    if (!isValid) {
      console.error('Invalid webhook signature')
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 401,
      })
    }
  }

  if (type !== 'payment' || !data?.id) {
    return new Response(JSON.stringify({ status: 'ignored' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  }

  const paymentId = data.id

  // Initialize Supabase client
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
    throw new Error(`Mercado Pago API error: ${paymentData.message}`)
  }

  const { status, metadata } = paymentData
  const orderId = metadata?.order_id

  if (!orderId) {
    throw new Error('Missing order_id in payment metadata')
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
  const { error } = await supabase
    .from('orders')
    .update({ status: orderStatus })
    .eq('id', orderId)

  if (error) {
    throw error
  }

  return new Response(JSON.stringify({ status: 'success' }), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  })
})
