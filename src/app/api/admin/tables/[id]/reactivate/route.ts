import { NextRequest, NextResponse } from 'next/server';
import { db, isDevDatabase, getSupabaseAdmin } from '@/infrastructure/database';
import { tables } from '@/infrastructure/database/schema';
import { eq } from 'drizzle-orm';
import { requireAuth, requireRole, getRestaurantId } from '@/lib/auth/admin';

interface RouteParams {
  params: Promise<{ id: string }>
}

// PATCH /api/admin/tables/[id]/reactivate - Reactivate an inactive table
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const authUser = await requireAuth();
    requireRole(authUser, ['dono', 'gerente']);

    const { id } = await params;
    const restaurantId = getRestaurantId(authUser);

    if (isDevDatabase()) {
      const existingTable = await db
        .select({ id: tables.id, active: tables.active })
        .from(tables)
        .where(eq(tables.id, id))
        .limit(1)
        .get();

      if (!existingTable) {
        return NextResponse.json({ error: 'Mesa não encontrada' }, { status: 404 });
      }

      if (existingTable.active) {
        return NextResponse.json({ error: 'Mesa já está ativa' }, { status: 409 });
      }

      await db.update(tables).set({ active: true }).where(eq(tables.id, id));

      const updated = await db.select().from(tables).where(eq(tables.id, id)).limit(1).get();
      return NextResponse.json({ table: updated });
    }

    const supabase = getSupabaseAdmin();

    const { data: existingTable, error: fetchError } = await supabase
      .from('tables')
      .select('id, active')
      .eq('id', id)
      .eq('restaurant_id', restaurantId)
      .single();

    if (fetchError || !existingTable) {
      return NextResponse.json({ error: 'Mesa não encontrada' }, { status: 404 });
    }

    if (existingTable.active) {
      return NextResponse.json({ error: 'Mesa já está ativa' }, { status: 409 });
    }

    const { data: table, error } = await supabase
      .from('tables')
      .update({ active: true })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error reactivating table:', error);
      return NextResponse.json({ error: 'Falha ao reativar mesa' }, { status: 500 });
    }

    return NextResponse.json({ table });
  } catch (error) {
    console.error('Unexpected error in /api/admin/tables/[id]/reactivate:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
