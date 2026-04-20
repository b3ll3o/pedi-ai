import { NextResponse } from 'next/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;

  // TODO: integrate with payment provider (Pagar.me/MercadoPago)
  // For now, return pending status as placeholder
  return NextResponse.json({
    status: 'pending',
    updated_at: new Date().toISOString(),
  });
}
