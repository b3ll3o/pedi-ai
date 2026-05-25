import { NextRequest, NextResponse } from 'next/server';

import { apiClient } from '@/lib/api-client';

interface ValidateRequest {
  restaurant_id: string;
  table_id: string;
  timestamp: number;
  signature: string;
}

interface TableResponse {
  id: string;
  name: string;
  number: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: ValidateRequest = await request.json();

    const { restaurant_id, table_id, timestamp, signature } = body;

    if (!restaurant_id || !table_id || !timestamp || !signature) {
      return NextResponse.json(
        { valid: false, error: 'Campos obrigatórios ausentes' },
        { status: 400 }
      );
    }

    const result = await apiClient.post<{ valid: boolean; table?: TableResponse; error?: string }>(
      '/tables/validate',
      { restaurant_id, table_id, timestamp, signature }
    );

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ valid: false, error: 'Erro interno do servidor' }, { status: 500 });
  }
}
