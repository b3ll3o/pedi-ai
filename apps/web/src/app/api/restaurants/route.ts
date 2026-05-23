import { NextResponse } from 'next/server';

import { sql } from '@/infrastructure/database/pg-client';

export async function GET() {
  try {
    const result = await sql<{
      id: string;
      name: string;
      description: string | null;
      address: string | null;
      phone: string | null;
      logoUrl: string | null;
      settings: string | null;
    }>`
      SELECT id, name, description, address, phone, "logoUrl", settings
      FROM "Restaurant"
      ORDER BY name ASC
    `;

    const response = {
      restaurants: result.map(
        (r: {
          id: string;
          name: string;
          description: string | null;
          address: string | null;
          phone: string | null;
          logoUrl: string | null;
          settings: string | null;
        }) => ({
          id: r.id,
          name: r.name,
          description: r.description,
          address: r.address,
          phone: r.phone,
          logo_url: r.logoUrl,
          horarios: r.settings ? JSON.parse(r.settings).horarios : null,
        })
      ),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Unexpected error in GET /api/restaurants:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
