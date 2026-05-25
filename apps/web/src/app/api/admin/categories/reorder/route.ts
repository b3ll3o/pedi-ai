import { NextRequest, NextResponse } from 'next/server';

import { apiClient } from '@/lib/api-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { restaurant_id, updates } = body;

    if (!restaurant_id || !updates || !Array.isArray(updates)) {
      return NextResponse.json(
        { error: 'restaurant_id e updates (array) são obrigatórios' },
        { status: 400 }
      );
    }

    const categories = updates.map((u: { id: string; position: number }) => ({
      id: u.id,
      sortOrder: u.position,
    }));

    await apiClient.post('/categories/reorder', categories);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in POST /api/admin/categories/reorder:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
