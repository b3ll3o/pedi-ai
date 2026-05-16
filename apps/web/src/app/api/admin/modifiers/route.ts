import { NextRequest, NextResponse } from 'next/server';
import { db, isDevDatabase, getSupabaseAdmin } from '@/infrastructure/database';
import {
  modifierGroups,
  modifierValues,
  products,
  categories,
} from '@/infrastructure/database/schema';
import { eq, asc, inArray } from 'drizzle-orm';
import { invalidateMenuCache } from '@/lib/offline/cache';
import { requireAuth, requireRole, getRestaurantId } from '@/lib/auth/admin';

/**
 * GET /api/admin/modifiers
 * Lista todos os modifier groups do restaurante com seus valores.
 */
export async function GET(_request: NextRequest) {
  try {
    const authUser = await requireAuth();
    requireRole(authUser, ['dono', 'gerente']);

    const restaurantId = getRestaurantId(authUser);

    if (isDevDatabase()) {
      // Busca modifier groups do restaurante usando Drizzle
      const groupsResult = await db
        .select()
        .from(modifierGroups)
        .where(eq(modifierGroups.restaurant_id, restaurantId))
        .orderBy(asc(modifierGroups.created_at));

      const groupIds = groupsResult.map((g: typeof modifierGroups.$inferSelect) => g.id);
      const valuesMap: Record<string, (typeof modifierValues.$inferSelect)[]> = {};

      if (groupIds.length > 0) {
        const valuesResult = await db
          .select()
          .from(modifierValues)
          .where(inArray(modifierValues.modifier_group_id, groupIds))
          .orderBy(asc(modifierValues.created_at));

        for (const val of valuesResult) {
          if (!valuesMap[val.modifier_group_id]) {
            valuesMap[val.modifier_group_id] = [];
          }
          valuesMap[val.modifier_group_id].push(val);
        }
      }

      // Monta resposta com groups e seus values
      const groupsWithValues = groupsResult.map((group: typeof modifierGroups.$inferSelect) => ({
        ...group,
        modifier_values: valuesMap[group.id] ?? [],
      }));

      return NextResponse.json({ modifier_groups: groupsWithValues });
    } else {
      const supabase = getSupabaseAdmin();

      // Busca modifier groups do restaurante usando Supabase
      const { data: groupsResult, error: groupsError } = await supabase
        .from('modifier_groups')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: true });

      if (groupsError) {
        console.error('Error fetching modifier groups:', groupsError);
        return NextResponse.json(
          { error: 'Erro ao buscar grupos de modificadores' },
          { status: 500 }
        );
      }

      const groupIds = groupsResult?.map((g) => g.id) || [];
      const valuesMap: Record<string, unknown[]> = {};

      if (groupIds.length > 0) {
        const { data: valuesResult, error: valuesError } = await supabase
          .from('modifier_values')
          .select('*')
          .in('modifier_group_id', groupIds)
          .order('created_at', { ascending: true });

        if (valuesError) {
          console.error('Error fetching modifier values:', valuesError);
          return NextResponse.json(
            { error: 'Erro ao buscar valores de modificadores' },
            { status: 500 }
          );
        }

        for (const val of valuesResult || []) {
          if (!valuesMap[val.modifier_group_id]) {
            valuesMap[val.modifier_group_id] = [];
          }
          valuesMap[val.modifier_group_id].push(val);
        }
      }

      // Monta resposta com groups e seus values
      const groupsWithValues = (groupsResult || []).map((group) => ({
        ...group,
        modifier_values: valuesMap[group.id] ?? [],
      }));

      return NextResponse.json({ modifier_groups: groupsWithValues });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro interno';
    const status = (error as Error & { status?: number }).status || 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * POST /api/admin/modifiers
 * Cria um novo modifier group para um produto.
 */
export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth();
    requireRole(authUser, ['dono', 'gerente']);

    const restaurantId = getRestaurantId(authUser);
    const body = await request.json();
    const { product_id, name, required, min_selections, max_selections } = body;

    // Validações
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });
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

    if (
      min_selections !== undefined &&
      max_selections !== undefined &&
      min_selections > max_selections
    ) {
      return NextResponse.json(
        { error: 'min_selections não pode ser maior que max_selections' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    if (isDevDatabase()) {
      // Valida que o product_id pertence ao restaurante via categoria (Drizzle)
      if (product_id) {
        const productResult = await db
          .select()
          .from(products)
          .leftJoin(categories, eq(products.category_id, categories.id))
          .where(eq(products.id, product_id))
          .limit(1);

        if (!productResult[0]) {
          return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
        }

        const { categories: cat } = productResult[0];
        if (!cat || cat.restaurant_id !== restaurantId) {
          return NextResponse.json(
            { error: 'Produto não pertence a este restaurante' },
            { status: 403 }
          );
        }
      }

      const newGroup = {
        id: crypto.randomUUID(),
        restaurant_id: restaurantId,
        name: name.trim(),
        required: required ?? false,
        min_selections: min_selections ?? 0,
        max_selections: max_selections ?? 1,
        created_at: now,
      };

      await db.insert(modifierGroups).values(newGroup);
      await invalidateMenuCache();
      return NextResponse.json({ modifier_group: newGroup }, { status: 201 });
    } else {
      const supabase = getSupabaseAdmin();

      // Valida que o product_id pertence ao restaurante via categoria (Supabase)
      if (product_id) {
        const { data: productResult, error: productError } = await supabase
          .from('products')
          .select('id, category_id, categories!inner(restaurant_id)')
          .eq('id', product_id)
          .single();

        if (productError || !productResult) {
          return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
        }

        const cat = productResult.categories as unknown as { restaurant_id: string } | null;
        if (!cat || cat.restaurant_id !== restaurantId) {
          return NextResponse.json(
            { error: 'Produto não pertence a este restaurante' },
            { status: 403 }
          );
        }
      }

      const newGroup = {
        id: crypto.randomUUID(),
        restaurant_id: restaurantId,
        name: name.trim(),
        required: required ?? false,
        min_selections: min_selections ?? 0,
        max_selections: max_selections ?? 1,
        created_at: now,
      };

      const { data, error } = await supabase
        .from('modifier_groups')
        .insert(newGroup)
        .select()
        .single();

      if (error) {
        console.error('Error creating modifier group:', error);
        return NextResponse.json(
          { error: 'Erro ao criar grupo de modificadores' },
          { status: 500 }
        );
      }

      await invalidateMenuCache();
      return NextResponse.json({ modifier_group: data }, { status: 201 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro interno';
    const status = (error as Error & { status?: number }).status || 500;
    return NextResponse.json({ error: message }, { status });
  }
}
