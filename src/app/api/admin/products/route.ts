import { NextRequest, NextResponse } from 'next/server'
import { db, isDevDatabase, getSupabaseAdmin } from '@/infrastructure/database'
import { products, categories } from '@/infrastructure/database/schema'
import { eq, and, asc, inArray } from 'drizzle-orm'
import { invalidateMenuCache } from '@/lib/offline/cache'
import { requireAuth, requireRole, getRestaurantId } from '@/lib/auth/admin'

export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAuth()
    requireRole(authUser, ['dono', 'gerente'])

    const restaurantId = getRestaurantId(authUser)
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('category_id')
    const activeOnly = searchParams.get('active') === 'true'

    if (isDevDatabase()) {
      // Primeiro busca as categorias do restaurant para filtrar os produtos usando Drizzle
      const categoryResult = await db.select().from(categories)
        .where(eq(categories.restaurant_id, restaurantId))

      if (!categoryResult || categoryResult.length === 0) {
        return NextResponse.json({ products: [] })
      }

      const categoryIds = categoryResult.map(c => c.id)

      // Filtra produtos por categoria(s) do restaurante
      const query = db.select({
        products: products,
        categories: categories
      })
        .from(products)
        .leftJoin(categories, eq(products.category_id, categories.id))
        .where(inArray(products.category_id, categoryIds))
        .orderBy(asc(products.sort_order))

      let result = await query.all()

      // Filtra por categoryId específico se fornecido
      if (categoryId) {
        result = result.filter(p => p.products.category_id === categoryId)
      }

      // Filtra por disponível se activeOnly
      if (activeOnly) {
        result = result.filter(p => p.products.available === true)
      }

      const productsWithCategory = result.map(r => ({
        ...r.products,
        category: r.categories
      }))

      return NextResponse.json({ products: productsWithCategory })
    } else {
      const supabase = getSupabaseAdmin()

      // Primeiro busca as categorias do restaurant para filtrar os produtos usando Supabase
      const { data: categoryResult, error: categoryError } = await supabase
        .from('categories')
        .select('id')
        .eq('restaurant_id', restaurantId)

      if (categoryError) {
        console.error('Error fetching categories:', categoryError)
        return NextResponse.json({ error: 'Erro ao buscar categorias' }, { status: 500 })
      }

      if (!categoryResult || categoryResult.length === 0) {
        return NextResponse.json({ products: [] })
      }

      const categoryIds = categoryResult.map(c => c.id)

      // Filtra produtos por categoria(s) do restaurante
      let query = supabase
        .from('products')
        .select('*, categories(*)')
        .in('category_id', categoryIds)
        .order('sort_order', { ascending: true })

      if (categoryId) {
        query = query.eq('category_id', categoryId)
      }

      if (activeOnly) {
        query = query.eq('available', true)
      }

      const { data: productsResult, error: productsError } = await query

      if (productsError) {
        console.error('Error fetching products:', productsError)
        return NextResponse.json({ error: 'Erro ao buscar produtos' }, { status: 500 })
      }

      return NextResponse.json({ products: productsResult || [] })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro interno'
    const status = (error as Error & { status?: number }).status || 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth()
    requireRole(authUser, ['dono', 'gerente'])

    const restaurantId = getRestaurantId(authUser)
    const body = await request.json()
    const { name, description, price, category_id, image_url, dietary_labels, available, sort_order } = body

    // Validações
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: 'Nome é obrigatório e não pode ser vazio' },
        { status: 400 }
      )
    }

    if (price === undefined || typeof price !== 'number' || price <= 0) {
      return NextResponse.json(
        { error: 'Preço deve ser um número maior que 0' },
        { status: 400 }
      )
    }

    if (!category_id || typeof category_id !== 'string') {
      return NextResponse.json(
        { error: 'category_id é obrigatório' },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()

    if (isDevDatabase()) {
      // Verifica se a categoria existe e pertence ao restaurant usando Drizzle
      const catResult = await db.select().from(categories)
        .where(and(eq(categories.id, category_id), eq(categories.restaurant_id, restaurantId)))
        .limit(1)

      if (!catResult[0]) {
        return NextResponse.json(
          { error: 'Categoria não encontrada ou não pertence a este restaurante' },
          { status: 404 }
        )
      }

      const newProduct = {
        id: crypto.randomUUID(),
        category_id,
        name: name.trim(),
        description: description || null,
        image_url: image_url || null,
        price,
        dietary_labels: dietary_labels || null,
        available: available ?? true,
        sort_order: sort_order ?? 0,
        created_at: now,
        updated_at: now,
      }

      await db.insert(products).values(newProduct)
      await invalidateMenuCache()
      return NextResponse.json({ product: newProduct }, { status: 201 })
    } else {
      const supabase = getSupabaseAdmin()

      // Verifica se a categoria existe e pertence ao restaurant usando Supabase
      const { data: catResult, error: catError } = await supabase
        .from('categories')
        .select('id')
        .eq('id', category_id)
        .eq('restaurant_id', restaurantId)
        .single()

      if (catError || !catResult) {
        return NextResponse.json(
          { error: 'Categoria não encontrada ou não pertence a este restaurante' },
          { status: 404 }
        )
      }

      const newProduct = {
        id: crypto.randomUUID(),
        category_id,
        name: name.trim(),
        description: description || null,
        image_url: image_url || null,
        price,
        dietary_labels: dietary_labels || null,
        available: available ?? true,
        sort_order: sort_order ?? 0,
        created_at: now,
        updated_at: now,
      }

      const { data: product, error } = await supabase
        .from('products')
        .insert(newProduct)
        .select()
        .single()

      if (error) {
        console.error('Error creating product:', error)
        return NextResponse.json({ error: 'Erro ao criar produto' }, { status: 500 })
      }

      await invalidateMenuCache()
      return NextResponse.json({ product }, { status: 201 })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro interno'
    const status = (error as Error & { status?: number }).status || 500
    return NextResponse.json({ error: message }, { status })
  }
}
