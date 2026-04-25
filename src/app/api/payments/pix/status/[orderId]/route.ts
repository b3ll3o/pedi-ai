import { NextResponse } from 'next/server';

const isDemoMode = process.env.NEXT_PUBLIC_DEMO_PAYMENT_MODE === 'true';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  await params;

  // In demo mode, always return confirmed status
  if (isDemoMode) {
    return NextResponse.json({
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
    });
  }

  // TODO: integrate with payment provider (Pagar.me/MercadoPago)
  // For now, return pending status as placeholder
  return NextResponse.json({
    status: 'pending',
    updated_at: new Date().toISOString(),
  });
}
