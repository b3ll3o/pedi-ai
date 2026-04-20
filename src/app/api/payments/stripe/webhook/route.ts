import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      )
    }

    let event: Stripe.Event

    try {
      event = Stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        const orderId = paymentIntent.metadata?.order_id

        if (orderId) {
          const { error: updateError } = await supabase
            .from('orders')
            .update({
              payment_status: 'paid',
              status: 'confirmed'
            })
            .eq('id', orderId)

          if (updateError) {
            console.error('Failed to update order payment_intent.succeeded:', updateError)
            return NextResponse.json(
              { error: 'Failed to update order' },
              { status: 500 }
            )
          }
        }
        break
      }

      case 'payment_intent.failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        const orderId = paymentIntent.metadata?.order_id

        if (orderId) {
          const { error: updateError } = await supabase
            .from('orders')
            .update({
              payment_status: 'failed',
              status: 'payment_failed'
            })
            .eq('id', orderId)

          if (updateError) {
            console.error('Failed to update order payment_intent.failed:', updateError)
            return NextResponse.json(
              { error: 'Failed to update order' },
              { status: 500 }
            )
          }
        }
        break
      }

      default:
        // Ignore unhandled event types
        break
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
