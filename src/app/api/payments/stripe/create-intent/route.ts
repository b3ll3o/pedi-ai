import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { order_id: orderId } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: 'order_id is required' },
        { status: 400 }
      );
    }

    // TODO: integrate with Stripe
    // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    // const paymentIntent = await stripe.paymentIntents.create({
    //   amount: ...,
    //   currency: 'brl',
    //   metadata: { order_id: orderId },
    // });

    return NextResponse.json({
      clientSecret: `pi_placeholder_${orderId}_secret_placeholder`,
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}
