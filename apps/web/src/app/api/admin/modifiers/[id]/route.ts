import { NextRequest, NextResponse } from 'next/server';
import { db, isDevDatabase, getSupabaseAdmin } from '@/infrastructure/database';
import { modifierGroups, modifierValues } from '@/infrastructure/database/schema';
import { eq, and, asc } from 'drizzle-orm';
import { invalidateMenuCache } from '@/lib/offline/cache';
import { requireAuth, requireRole, getRestaurantId } from '@/lib/auth/admin';

/**
 * GET /api/admin/modifiers/[id]
 * Retorna um modifier group específico com seus valores.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authUser = await requireAuth();
    requireRole(authUser, ['dono', 'gerente']);

    const restaurantId = getRestaurantId(authUser);
    const { id } = await params;

    if (isDevDatabase()) {
      // Fetch modifier group using Drizzle
      const groupResult = await db
        .select()
        .from(modifierGroups)
        .where(and(eq(modifierGroups.id, id), eq(modifierGroups.restaurant_id, restaurantId)))
        .limit(1);

      if (!groupResult[0]) {
        return NextResponse.json(
          { error: 'Grupo de modificadores não encontrado' },
          { status: 404 }
        );
      }

      // Fetch modifier values
      const valuesResult = await db
        .select()
        .from(modifierValues)
        .where(eq(modifierValues.modifier_group_id, id))
        .orderBy(asc(modifierValues.created_at));

      return NextResponse.json({
        modifier_group: groupResult[0],
        modifier_values: valuesResult,
      });
    } else {
      const supabase = getSupabaseAdmin();

      // Fetch modifier group using Supabase
      const { data: group, error: groupError } = await supabase
        .from('modifier_groups')
        .select('*')
        .eq('id', id)
        .eq('restaurant_id', restaurantId)
        .single();

      if (groupError || !group) {
        return NextResponse.json(
          { error: 'Grupo de modificadores não encontrado' },
          { status: 404 }
        );
      }

      // Fetch modifier values
      const { data: values, error: valuesError } = await supabase
        .from('modifier_values')
        .select('*')
        .eq('modifier_group_id', id)
        .order('created_at', { ascending: true });

      if (valuesError) {
        console.error('Error fetching modifier values:', valuesError);
        return NextResponse.json(
          { error: 'Erro ao buscar valores do modificador' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        modifier_group: group,
        modifier_values: values || [],
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro interno';
    const status = (error as Error & { status?: number }).status || 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * PUT /api/admin/modifiers/[id]
 * Atualiza um modifier group.
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authUser = await requireAuth();
    requireRole(authUser, ['dono', 'gerente']);

    const restaurantId = getRestaurantId(authUser);
    const { id } = await params;
    const body = await request.json();
    const { name, required, min_selections, max_selections } = body;

    // Validações
    if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
      return NextResponse.json({ error: 'Nome não pode ser vazio' }, { status: 400 });
    }

    if (
      min_selections !== undefined &&
      (typeof min_selections !== 'number' || min_selections < 0)
    ) {
      return NextResponse.json(
        { error: 'min_selections deve ser um número >= 0' },
        { status: 400 }
      );
    }

    if (
      max_selections !== undefined &&
      (typeof max_selections !== 'number' || max_selections < 1)
    ) {
      return NextResponse.json(
        { error: 'max_selections deve ser um número >= 1' },
        { status: 400 }
      );
    }

    // Valida range se ambos fornecidos
    const currentMin = min_selections ?? 0;
    const currentMax = max_selections ?? 1;
    if (min_selections !== undefined && max_selections !== undefined && currentMin > currentMax) {
      return NextResponse.json(
        { error: 'min_selections não pode ser maior que max_selections' },
        { status: 400 }
      );
    }

    if (isDevDatabase()) {
      // Verifica modifier group existe e pertence ao restaurante usando Drizzle
      const existing = await db
        .select()
        .from(modifierGroups)
        .where(and(eq(modifierGroups.id, id), eq(modifierGroups.restaurant_id, restaurantId)))
        .limit(1);

      if (!existing[0]) {
        return NextResponse.json(
          { error: 'Grupo de modificadores não encontrado' },
          { status: 404 }
        );
      }

      const updateData: Record<string, unknown> = {};
      if (name !== undefined) updateData.name = name.trim();
      if (required !== undefined) updateData.required = required;
      if (min_selections !== undefined) updateData.min_selections = min_selections;
      if (max_selections !== undefined) updateData.max_selections = max_selections;

      await db.update(modifierGroups).set(updateData).where(eq(modifierGroups.id, id));

      const updated = await db
        .select()
        .from(modifierGroups)
        .where(eq(modifierGroups.id, id))
        .limit(1);
      await invalidateMenuCache();
      return NextResponse.json({ modifier_group: updated[0] });
    } else {
      const supabase = getSupabaseAdmin();

      // Verifica modifier group existe e pertence ao restaurante usando Supabase
      const { data: existing, error: fetchError } = await supabase
        .from('modifier_groups')
        .select('*')
        .eq('id', id)
        .eq('restaurant_id', restaurantId)
        .single();

      if (fetchError || !existing) {
        return NextResponse.json(
          { error: 'Grupo de modificadores não encontrado' },
          { status: 404 }
        );
      }

      const updateData: Record<string, unknown> = {};
      if (name !== undefined) updateData.name = name.trim();
      if (required !== undefined) updateData.required = required;
      if (min_selections !== undefined) updateData.min_selections = min_selections;
      if (max_selections !== undefined) updateData.max_selections = max_selections;

      const { data: updated, error: updateError } = await supabase
        .from('modifier_groups')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating modifier group:', updateError);
        return NextResponse.json(
          { error: 'Erro ao atualizar grupo de modificadores' },
          { status: 500 }
        );
      }

      await invalidateMenuCache();
      return NextResponse.json({ modifier_group: updated });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro interno';
    const status = (error as Error & { status?: number }).status || 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * DELETE /api/admin/modifiers/[id]
 * Remove um modifier group.
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
      // Verifica modifier group existe e pertence ao restaurante usando Drizzle
      const existing = await db
        .select()
        .from(modifierGroups)
        .where(and(eq(modifierGroups.id, id), eq(modifierGroups.restaurant_id, restaurantId)))
        .limit(1);

      if (!existing[0]) {
        return NextResponse.json(
          { error: 'Grupo de modificadores não encontrado' },
          { status: 404 }
        );
      }

      // Hard delete
      await db.delete(modifierValues).where(eq(modifierValues.modifier_group_id, id));
      await db.delete(modifierGroups).where(eq(modifierGroups.id, id));

      await invalidateMenuCache();
      return NextResponse.json({ success: true });
    } else {
      const supabase = getSupabaseAdmin();

      // Verifica modifier group existe e pertence ao restaurante usando Supabase
      const { data: existing, error: fetchError } = await supabase
        .from('modifier_groups')
        .select('id')
        .eq('id', id)
        .eq('restaurant_id', restaurantId)
        .single();

      if (fetchError || !existing) {
        return NextResponse.json(
          { error: 'Grupo de modificadores não encontrado' },
          { status: 404 }
        );
      }

      // Delete modifier values first
      const { error: valuesError } = await supabase
        .from('modifier_values')
        .delete()
        .eq('modifier_group_id', id);

      if (valuesError) {
        console.error('Error deleting modifier values:', valuesError);
        return NextResponse.json(
          { error: 'Erro ao deletar valores do modificador' },
          { status: 500 }
        );
      }

      // Delete modifier group
      const { error: deleteError } = await supabase.from('modifier_groups').delete().eq('id', id);

      if (deleteError) {
        console.error('Error deleting modifier group:', deleteError);
        return NextResponse.json(
          { error: 'Erro ao deletar grupo de modificadores' },
          { status: 500 }
        );
      }

      await invalidateMenuCache();
      return NextResponse.json({ success: true });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro interno';
    const status = (error as Error & { status?: number }).status || 500;
    return NextResponse.json({ error: message }, { status });
  }
}
