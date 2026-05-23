import { NextRequest, NextResponse } from 'next/server';

import { sql } from '@/infrastructure/database/pg-client';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'ID do restaurante é obrigatório' }, { status: 400 });
    }

    const result = await sql<{
      id: string;
      name: string;
      description: string | null;
      address: string | null;
      phone: string | null;
      logo_url: string | null;
      settings: Record<string, unknown> | null;
    }>`
      SELECT id, name, description, address, phone, logo_url, settings
      FROM restaurants
      WHERE id = ${id}
      LIMIT 1
    `;

    if (!result || result.length === 0) {
      return NextResponse.json({ error: 'Restaurante não encontrado' }, { status: 404 });
    }

    const restaurant = result[0];
    const response = {
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        description: restaurant.description,
        address: restaurant.address,
        phone: restaurant.phone,
        logo_url: restaurant.logo_url,
        horarios: restaurant.settings?.horarios || null,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Unexpected error in GET /api/restaurants/[id]:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
