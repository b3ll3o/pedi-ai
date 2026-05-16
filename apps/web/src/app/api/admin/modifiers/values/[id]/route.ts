import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db, isDevDatabase } from '@/infrastructure/database';
import { modifierGroups, modifierValues } from '@/infrastructure/database/schema';
import { eq } from 'drizzle-orm';
import { invalidateMenuCache } from '@/lib/offline/cache';
import { requireAuth, requireRole, getRestaurantId } from '@/lib/auth/admin';

/**
 * PUT /api/admin/modifiers/values/[id]
 * Atualiza um valor de modificador.
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authUser = await requireAuth();
    requireRole(authUser, ['dono', 'gerente']);

    const restaurantId = getRestaurantId(authUser);
    const { id } = await params;
    const body = await request.json();
    const { name, price_adjustment, available } = body;

    if (isDevDatabase()) {
      // Busca o modifier value e verifica ownership via modifier_group
      const existingValue = await db
        .select()
        .from(modifierValues)
        .where(eq(modifierValues.id, id))
        .limit(1)
        .get();

      if (!existingValue) {
        return NextResponse.json({ error: 'Valor de modificador não encontrado' }, { status: 404 });
      }

      // Verifica que o modifier group pertence ao restaurante
      const groupResult = await db
        .select({ restaurant_id: modifierGroups.restaurant_id })
        .from(modifierGroups)
        .where(eq(modifierGroups.id, existingValue.modifier_group_id))
        .limit(1)
        .get();

      if (!groupResult || groupResult.restaurant_id !== restaurantId) {
        return NextResponse.json(
          { error: 'Valor de modificador não pertence a este restaurante' },
          { status: 403 }
        );
      }

      // Validações
      if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
        return NextResponse.json({ error: 'Nome não pode ser vazio' }, { status: 400 });
      }

      if (price_adjustment !== undefined && typeof price_adjustment !== 'number') {
        return NextResponse.json({ error: 'price_adjustment deve ser um número' }, { status: 400 });
      }

      if (available !== undefined && typeof available !== 'boolean') {
        return NextResponse.json({ error: 'available deve ser um booleano' }, { status: 400 });
      }

      const updateData: Record<string, unknown> = {};
      if (name !== undefined) updateData.name = name.trim();
      if (price_adjustment !== undefined) updateData.price_adjustment = price_adjustment;
      if (available !== undefined) updateData.available = available;

      if (Object.keys(updateData).length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await db
          .update(modifierValues)
          .set(updateData as any)
          .where(eq(modifierValues.id, id));
      }

      // Fetch updated value
      const updatedValue = await db
        .select()
        .from(modifierValues)
        .where(eq(modifierValues.id, id))
        .limit(1)
        .get();

      await invalidateMenuCache();
      return NextResponse.json({ modifier_value: updatedValue });
    }

    // Production: use Supabase
    const supabase = await createClient();

    // Busca o modifier value e verifica ownership via modifier_group
    const { data: existingValue, error: fetchError } = await supabase
      .from('modifier_values')
      .select('id, modifier_group_id, modifier_groups!inner(restaurant_id)')
      .eq('id', id)
      .single();

    if (fetchError || !existingValue) {
      return NextResponse.json({ error: 'Valor de modificador não encontrado' }, { status: 404 });
    }

    // @ts-expect-error - nested select
    const groupRestaurantId = existingValue.modifier_groups?.restaurant_id;
    if (groupRestaurantId !== restaurantId) {
      return NextResponse.json(
        { error: 'Valor de modificador não pertence a este restaurante' },
        { status: 403 }
      );
    }

    // Validações
    if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
      return NextResponse.json({ error: 'Nome não pode ser vazio' }, { status: 400 });
    }

    if (price_adjustment !== undefined && typeof price_adjustment !== 'number') {
      return NextResponse.json({ error: 'price_adjustment deve ser um número' }, { status: 400 });
    }

    if (available !== undefined && typeof available !== 'boolean') {
      return NextResponse.json({ error: 'available deve ser um booleano' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (price_adjustment !== undefined) updateData.price_adjustment = price_adjustment;
    if (available !== undefined) updateData.available = available;

    if (Object.keys(updateData).length > 0) {
      const { data: value, error } = await supabase
        .from('modifier_values')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update(updateData as any)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar modifier value:', error);
        return NextResponse.json(
          { error: 'Falha ao atualizar valor de modificador' },
          { status: 500 }
        );
      }

      await invalidateMenuCache();
      return NextResponse.json({ modifier_value: value });
    }

    await invalidateMenuCache();
    return NextResponse.json({ modifier_value: existingValue });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro interno';
    const status = (error as Error & { status?: number }).status || 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * DELETE /api/admin/modifiers/values/[id]
 * Soft delete de um valor de modificador.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth();
    requireRole(authUser, ['dono', 'gerente']);

    const restaurantId = getRestaurantId(authUser);
    const { id } = await params;

    if (isDevDatabase()) {
      // Busca o modifier value e verifica ownership via modifier_group
      const existingValue = await db
        .select()
        .from(modifierValues)
        .where(eq(modifierValues.id, id))
        .limit(1)
        .get();

      if (!existingValue) {
        return NextResponse.json({ error: 'Valor de modificador não encontrado' }, { status: 404 });
      }

      // Verifica que o modifier group pertence ao restaurante
      const groupResult = await db
        .select({ restaurant_id: modifierGroups.restaurant_id })
        .from(modifierGroups)
        .where(eq(modifierGroups.id, existingValue.modifier_group_id))
        .limit(1)
        .get();

      if (!groupResult || groupResult.restaurant_id !== restaurantId) {
        return NextResponse.json(
          { error: 'Valor de modificador não pertence a este restaurante' },
          { status: 403 }
        );
      }

      // Soft delete do modifier value (set available = false)
      await db.update(modifierValues).set({ available: false }).where(eq(modifierValues.id, id));

      await invalidateMenuCache();
      return NextResponse.json({ success: true });
    }

    // Production: use Supabase
    const supabase = await createClient();

    // Busca o modifier value e verifica ownership via modifier_group
    const { data: existingValue, error: fetchError } = await supabase
      .from('modifier_values')
      .select('id, modifier_group_id, modifier_groups!inner(restaurant_id)')
      .eq('id', id)
      .single();

    if (fetchError || !existingValue) {
      return NextResponse.json({ error: 'Valor de modificador não encontrado' }, { status: 404 });
    }

    // @ts-expect-error - nested select
    const groupRestaurantId = existingValue.modifier_groups?.restaurant_id;
    if (groupRestaurantId !== restaurantId) {
      return NextResponse.json(
        { error: 'Valor de modificador não pertence a este restaurante' },
        { status: 403 }
      );
    }

    // Soft delete do modifier value (atualiza deleted_at se existir)
    const { error } = await supabase
      .from('modifier_values')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir modifier value:', error);
      return NextResponse.json({ error: 'Falha ao excluir valor de modificador' }, { status: 500 });
    }

    await invalidateMenuCache();
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro interno';
    const status = (error as Error & { status?: number }).status || 500;
    return NextResponse.json({ error: message }, { status });
  }
}
