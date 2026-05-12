import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { db } from '@/infrastructure/persistence/database'
import { PedidoRepository } from '@/infrastructure/persistence/pedido/PedidoRepository'
import { Pedido } from '@/domain/pedido/entities/Pedido'
import { ItemPedido } from '@/domain/pedido/entities/ItemPedido'
import { StatusPedido } from '@/domain/pedido/value-objects/StatusPedido'
import { Dinheiro } from '@/domain/shared/value-objects/Dinheiro'
import { ModificadorSelecionado } from '@/domain/pedido/value-objects/ModificadorSelecionado'

interface ItemInput {
  produtoId: string
  nome: string
  precoUnitario: number
  quantidade: number
  modificadores?: Array<{
    grupoId: string
    grupoNome: string
    modificadorId: string
    modificadorNome: string
    precoAdicional: number
  }>
  observacao?: string
}

interface CriarPedidoRequest {
  restauranteId: string
  mesaId?: string
  clienteId?: string
  itens: ItemInput[]
}

export async function POST(request: NextRequest) {
  try {
    const body: CriarPedidoRequest = await request.json()

    if (!body.restauranteId) {
      return NextResponse.json(
        { error: 'restauranteId é obrigatório' },
        { status: 400 }
      )
    }

    if (!body.mesaId) {
      return NextResponse.json(
        { error: 'mesaId é obrigatório' },
        { status: 400 }
      )
    }

    if (!body.itens || body.itens.length === 0) {
      return NextResponse.json(
        { error: 'itens não pode ser vazio' },
        { status: 400 }
      )
    }

    const repository = new PedidoRepository(db)

    const itensPedido = body.itens.map(item => {
      const modificadores = (item.modificadores || []).map(
        mod =>
          new ModificadorSelecionado({
            grupoId: mod.grupoId,
            grupoNome: mod.grupoNome,
            modificadorId: mod.modificadorId,
            modificadorNome: mod.modificadorNome,
            precoAdicional: mod.precoAdicional,
          })
      )

      return ItemPedido.criar({
        id: randomUUID(),
        pedidoId: undefined,
        produtoId: item.produtoId,
        nome: item.nome,
        precoUnitario: Dinheiro.criar(item.precoUnitario, 'BRL'),
        quantidade: item.quantidade,
        modificadoresSelecionados: modificadores,
        observacao: item.observacao,
      })
    })

    const pedido = Pedido.criar({
      id: randomUUID(),
      restauranteId: body.restauranteId,
      mesaId: body.mesaId,
      clienteId: body.clienteId,
      status: StatusPedido.RECEIVED,
      itens: itensPedido,
    })

    await repository.create(pedido)

    return NextResponse.json({
      id: pedido.id,
      status: pedido.status.toString(),
      createdAt: pedido.createdAt.toISOString(),
    })
  } catch (error) {
    console.error('Erro ao criar pedido:', error)
    return NextResponse.json(
      { error: 'Erro interno ao criar pedido' },
      { status: 500 }
    )
  }
}
