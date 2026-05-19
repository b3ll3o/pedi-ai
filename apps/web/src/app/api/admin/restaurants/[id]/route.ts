import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/infrastructure/database/pg-client';
import { getSession } from '@/lib/auth/session';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const userId = session.user.id;

    const { id: restaurantId } = await params;

    // Verify user has access to this restaurant
    const profileResult = await sql`
      SELECT role FROM users_profiles
      WHERE user_id = ${userId} AND restaurant_id = ${restaurantId}
      LIMIT 1
    `;

    if (!profileResult[0]) {
      return NextResponse.json({ error: 'Acesso negado a este restaurante' }, { status: 403 });
    }

    // Get restaurant
    const restaurantResult = await sql`
      SELECT * FROM restaurants WHERE id = ${restaurantId} LIMIT 1
    `;

    if (!restaurantResult[0]) {
      return NextResponse.json({ error: 'Restaurante não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ restaurant: restaurantResult[0] });
  } catch (error) {
    console.error('Error in GET /api/admin/restaurants/[id]:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const userId = session.user.id;

    const { id: restaurantId } = await params;

    // Verify user has access and is owner/manager
    const profileResult = await sql`
      SELECT role FROM users_profiles
      WHERE user_id = ${userId} AND restaurant_id = ${restaurantId}
      LIMIT 1
    `;

    if (!profileResult[0] || (profileResult[0].role !== 'dono' && profileResult[0].role !== 'gerente')) {
      return NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, address, phone, logo_url } = body;
    const now = new Date().toISOString();

    // Update with individual fields
    await sql`
      UPDATE restaurants
      SET
        name = COALESCE(${name?.trim() || null}, name),
        description = ${description !== undefined ? (description?.trim() || null) : null},
        address = ${address !== undefined ? (address?.trim() || null) : null},
        phone = ${phone !== undefined ? (phone?.trim() || null) : null},
        logo_url = ${logo_url !== undefined ? (logo_url || null) : null},
        updated_at = ${now}
      WHERE id = ${restaurantId}
    `;

    // Fetch updated restaurant
    const updatedRestaurant = await sql`
      SELECT * FROM restaurants WHERE id = ${restaurantId} LIMIT 1
    `;

    return NextResponse.json({ restaurant: updatedRestaurant[0] });
  } catch (error) {
    console.error('Error in PUT /api/admin/restaurants/[id]:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const userId = session.user.id;

    const { id: restaurantId } = await params;

    // Verify user is owner
    const profileResult = await sql`
      SELECT role FROM users_profiles
      WHERE user_id = ${userId} AND restaurant_id = ${restaurantId}
      LIMIT 1
    `;

    if (!profileResult[0] || profileResult[0].role !== 'dono') {
      return NextResponse.json(
        { error: 'Apenas o proprietário pode excluir um restaurante' },
        { status: 403 }
      );
    }

    // Soft delete restaurant - set deleted_at instead of actually deleting
    await sql`
      UPDATE restaurants SET active = false, updated_at = ${new Date().toISOString()}
      WHERE id = ${restaurantId}
    `;

    return NextResponse.json({
      success: true,
      message: 'Restaurante removido com sucesso (soft delete)',
    });
  } catch (error) {
    console.error('Error in DELETE /api/admin/restaurants/[id]:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
