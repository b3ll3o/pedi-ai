import { NextRequest, NextResponse } from 'next/server';
import { db, isDevDatabase, getSupabaseAdmin } from '@/infrastructure/database';
import { orders, orderItems, tables } from '@/infrastructure/database/schema';
import { eq, desc } from 'drizzle-orm';

interface ItemInput {
  produtoId: string;
  nome: string;
  precoUnitario: number;
  quantidade: number;
  modificadores?: Array<{
    grupoId: string;
    grupoNome: string;
    modificadorId: string;
    modificadorNome: string;
    precoAdicional: number;
  }>;
  observacao?: string;
}

interface CriarPedidoRequest {
  restauranteId: string;
  mesaId?: string;
  clienteId?: string;
  itens: ItemInput[];
}

export async function POST(request: NextRequest) {
  try {
    const body: CriarPedidoRequest = await request.json();

    const { restauranteId, mesaId, clienteId, itens } = body;

    if (!restauranteId || !itens || itens.length === 0) {
      return NextResponse.json(
        { error: 'restauranteId e itens são obrigatórios' },
        { status: 400 }
      );
    }

    // Calcular totais
    let subtotal = 0;
    for (const item of itens) {
      const itemSubtotal = item.precoUnitario * item.quantidade;
      const modifiersTotal = (item.modificadores || []).reduce(
        (sum, m) => sum + m.precoAdicional,
        0
      ) * item.quantidade;
      subtotal += itemSubtotal + modifiersTotal;
    }

    const TAX_RATE = 0.1;
    const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;

    const now = new Date().toISOString();
    const orderId = crypto.randomUUID();

    if (isDevDatabase()) {
      // Verificar idempotência
      const existingOrder = await db
        .select()
        .from(orders)
        .where(eq(orders.customer_id, clienteId || ''))
        .limit(1);

      // Determinar restaurant_id a partir da mesa se necessário
      let finalRestaurantId = restauranteId;
      if (!finalRestaurantId && mesaId) {
        const tableResult = await db
          .select({ restaurant_id: tables.restaurant_id })
          .from(tables)
          .where(eq(tables.id, mesaId))
          .limit(1);
        if (tableResult.length > 0) {
          finalRestaurantId = tableResult[0].restaurant_id;
        }
      }

      // Criar pedido
      const newOrder = {
        id: orderId,
        restaurant_id: finalRestaurantId,
        table_id: mesaId || null,
        customer_id: clienteId || null,
        customer_phone: null,
        customer_name: null,
        status: 'pending_payment' as const,
        subtotal,
        tax,
        total,
        payment_method: null,
        payment_status: 'pending' as const,
        idempotency_key: null,
        created_at: now,
        updated_at: now,
      };

      await db.insert(orders).values(newOrder);

      // Inserir itens do pedido
      for (const item of itens) {
        const itemId = crypto.randomUUID();
        await db.insert(orderItems).values({
          id: itemId,
          order_id: orderId,
          product_id: item.produtoId,
          combo_id: null,
          quantity: item.quantidade,
          unit_price: item.precoUnitario,
          total_price: item.precoUnitario * item.quantidade,
          notes: item.observacao || null,
          created_at: now,
        });
      }

      return NextResponse.json({
        id: orderId,
        status: 'pending_payment',
        total,
        created_at: now,
      });
    } else {
      const supabase = getSupabaseAdmin();

      // Determinar restaurant_id a partir da mesa se necessário
      let finalRestaurantId = restauranteId;
      if (!finalRestaurantId && mesaId) {
        const { data: table } = await supabase
          .from('tables')
          .select('restaurant_id')
          .eq('id', mesaId)
          .single();
        if (table) {
          finalRestaurantId = table.restaurant_id;
        }
      }

      // Criar pedido
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          restaurant_id: finalRestaurantId,
          table_id: mesaId || null,
          customer_id: clienteId || null,
          customer_phone: null,
          customer_name: null,
          status: 'pending_payment',
          subtotal,
          tax,
          total,
          payment_method: null,
          payment_status: 'pending',
          idempotency_key: null,
        })
        .select()
        .single();

      if (orderError) {
        console.error('Erro ao criar pedido:', orderError);
        return NextResponse.json(
          { error: 'Erro ao criar pedido' },
          { status: 500 }
        );
      }

      // Inserir itens do pedido
      const orderItemsToInsert = itens.map((item) => ({
        order_id: order.id,
        product_id: item.produtoId,
        combo_id: null,
        quantity: item.quantidade,
        unit_price: item.precoUnitario,
        total_price: item.precoUnitario * item.quantidade,
        notes: item.observacao || null,
      }));

      if (orderItemsToInsert.length > 0) {
        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItemsToInsert);

        if (itemsError) {
          console.error('Erro ao criar itens do pedido:', itemsError);
          // Rollback - deletar o pedido
          await supabase.from('orders').delete().eq('id', order.id);
          return NextResponse.json(
            { error: 'Erro ao criar itens do pedido' },
            { status: 500 }
          );
        }
      }

      return NextResponse.json({
        id: order.id,
        status: order.status,
        total: order.total,
        created_at: order.created_at,
      });
    }
  } catch (error) {
    console.error('Erro ao criar pedido:', error);

    const message = error instanceof Error ? error.message : 'Erro interno ao criar pedido';
    const status = message.includes('é obrigatório') || message.includes('não pode ser vazio') ? 400 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
