import { NextResponse } from 'next/server';

import { apiClient } from '@/lib/api-client';

interface PixStatusResponse {
  status: 'pending' | 'confirmed' | 'expired' | 'payment_failed';
  updated_at: string;
  confirmed_at?: string;
  expires_at?: string;
}

interface ApiPixStatus {
  orderId: string;
  status: string;
  qrCode: string | null;
  expiresAt: string | null;
}

const isDemoMode = process.env.NEXT_PUBLIC_DEMO_PAYMENT_MODE === 'true';

function getDemoStatus(): PixStatusResponse {
  return {
    status: 'confirmed',
    confirmed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function mapApiStatusToResponse(apiStatus: ApiPixStatus): PixStatusResponse {
  const statusMap: Record<string, PixStatusResponse['status']> = {
    pending: 'pending',
    succeeded: 'confirmed',
    paid: 'confirmed',
    failed: 'payment_failed',
    expired: 'expired',
  };

  return {
    status: statusMap[apiStatus.status] || 'pending',
    updated_at: new Date().toISOString(),
    expires_at: apiStatus.expiresAt || undefined,
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> }
): Promise<NextResponse<PixStatusResponse>> {
  const { orderId } = await params;

  // DEMO MODE: Return simulated confirmed status
  if (isDemoMode) {
    return NextResponse.json(getDemoStatus());
  }

  try {
    const result = await apiClient.get<ApiPixStatus>(`/payments/pix/status/${orderId}`);

    return NextResponse.json(mapApiStatusToResponse(result));
  } catch (error) {
    console.error('Error in payments/pix/status:', error);
    return NextResponse.json(
      { status: 'pending', updated_at: new Date().toISOString() },
      { status: 500 }
    );
  }
}
