import { NextRequest, NextResponse } from 'next/server';
import { db, isDevDatabase, getSupabaseAdmin } from '@/infrastructure/database';
import { tables } from '@/infrastructure/database/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { requireAuth, requireRole, getRestaurantId } from '@/lib/auth/admin';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/admin/tables/[id] - Get a single table
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const authUser = await requireAuth();
    requireRole(authUser, ['dono', 'gerente']);

    const { id } = await params;
    const restaurantId = getRestaurantId(authUser);

    if (isDevDatabase()) {
      const table = await db
        .select()
        .from(tables)
        .where(
          and(eq(tables.id, id), eq(tables.restaurant_id, restaurantId), isNull(tables.deleted_at))
        )
        .limit(1)
        .get();

      if (!table) {
        return NextResponse.json({ error: 'Table not found' }, { status: 404 });
      }

      return NextResponse.json({ table });
    }

    const supabase = getSupabaseAdmin();

    const { data: table, error } = await supabase
      .from('tables')
      .select('*')
      .eq('id', id)
      .eq('restaurant_id', restaurantId)
      .is('deleted_at', null)
      .single();

    if (error) {
      console.error('Error fetching table:', error);
      return NextResponse.json({ error: 'Failed to fetch table' }, { status: 500 });
    }

    if (!table) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    return NextResponse.json({ table });
  } catch (error) {
    console.error('Unexpected error in /api/admin/tables/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/admin/tables/[id] - Update a table
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const authUser = await requireAuth();
    requireRole(authUser, ['dono', 'gerente']);

    const { id } = await params;
    const restaurantId = getRestaurantId(authUser);
    const body = await request.json();
    const { number, name, capacity, active, qr_code } = body;

    if (isDevDatabase()) {
      // Check if table exists
      const existingTable = await db
        .select({ id: tables.id, restaurant_id: tables.restaurant_id, number: tables.number })
        .from(tables)
        .where(
          and(eq(tables.id, id), eq(tables.restaurant_id, restaurantId), isNull(tables.deleted_at))
        )
        .limit(1)
        .get();

      if (!existingTable) {
        return NextResponse.json({ error: 'Table not found' }, { status: 404 });
      }

      // If changing number, check conflict
      if (number !== undefined && number !== existingTable.number) {
        const conflict = await db
          .select({ id: tables.id })
          .from(tables)
          .where(
            and(
              eq(tables.restaurant_id, existingTable.restaurant_id),
              eq(tables.number, number),
              isNull(tables.deleted_at)
            )
          )
          .limit(1)
          .get();

        if (conflict) {
          return NextResponse.json(
            { error: 'Table number already exists for this restaurant' },
            { status: 409 }
          );
        }
      }

      const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (number !== undefined) updateData.number = number;
      if (name !== undefined) updateData.name = name;
      if (capacity !== undefined) updateData.capacity = capacity;
      if (active !== undefined) updateData.active = active;
      if (qr_code !== undefined) updateData.qr_code = qr_code;
      if (Object.keys(updateData).length > 0) {
        await db
          .update(tables)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .set(updateData as any)
          .where(eq(tables.id, id));
      }
      const updated = await db.select().from(tables).where(eq(tables.id, id)).limit(1).get();
      return NextResponse.json({ table: updated });
    }

    const supabase = getSupabaseAdmin();

    // Check if table exists
    const { data: existingTable, error: fetchError } = await supabase
      .from('tables')
      .select('id, restaurant_id, number')
      .eq('id', id)
      .eq('restaurant_id', restaurantId)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existingTable) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    // If changing number, check conflict
    if (number !== undefined && number !== existingTable.number) {
      const { data: conflictTable, error: conflictError } = await supabase
        .from('tables')
        .select('id')
        .eq('restaurant_id', existingTable.restaurant_id as string)
        .eq('number', number)
        .neq('id', id)
        .single();

      if (conflictError && conflictError.code !== 'PGRST116') {
        console.error('Error checking table conflict:', conflictError);
        return NextResponse.json({ error: 'Failed to check table conflict' }, { status: 500 });
      }

      if (conflictTable) {
        return NextResponse.json(
          { error: 'Table number already exists for this restaurant' },
          { status: 409 }
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    if (number !== undefined) updateData.number = number;
    if (name !== undefined) updateData.name = name;
    if (capacity !== undefined) updateData.capacity = capacity;
    if (active !== undefined) updateData.active = active;
    if (qr_code !== undefined) updateData.qr_code = qr_code;

    const { data: table, error } = await supabase
      .from('tables')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating table:', error);
      return NextResponse.json({ error: 'Failed to update table' }, { status: 500 });
    }

    return NextResponse.json({ table });
  } catch (error) {
    console.error('Unexpected error in /api/admin/tables/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/admin/tables/[id] - Delete a table (soft delete)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const authUser = await requireAuth();
    requireRole(authUser, ['dono', 'gerente']);

    const { id } = await params;
    const restaurantId = getRestaurantId(authUser);

    if (isDevDatabase()) {
      const existingTable = await db
        .select({ id: tables.id })
        .from(tables)
        .where(
          and(eq(tables.id, id), eq(tables.restaurant_id, restaurantId), isNull(tables.deleted_at))
        )
        .limit(1)
        .get();

      if (!existingTable) {
        return NextResponse.json({ error: 'Table not found' }, { status: 404 });
      }

      // Soft delete
      await db
        .update(tables)
        .set({ deleted_at: new Date().toISOString() })
        .where(eq(tables.id, id));

      return NextResponse.json({
        success: true,
        message: 'Mesa removida com sucesso (soft delete)',
      });
    }

    const supabase = getSupabaseAdmin();

    // Check if table exists
    const { data: existingTable, error: fetchError } = await supabase
      .from('tables')
      .select('id')
      .eq('id', id)
      .eq('restaurant_id', restaurantId)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existingTable) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    // Soft delete
    const { error } = await supabase
      .from('tables')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Error deleting table:', error);
      return NextResponse.json({ error: 'Failed to delete table' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Mesa removida com sucesso (soft delete)' });
  } catch (error) {
    console.error('Unexpected error in /api/admin/tables/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
