import { UseCase } from '@/application/shared/types/UseCase';
import {
  IItemCardapioRepository,
  ComboAggregate,
  Combo,
  ItemCardapio,
  CardapioAtualizadoEvent,
} from '@/domain/cardapio';
import { EventDispatcher } from '@/domain/shared';
import { Dinheiro } from '@/domain/shared';

export interface CriarComboInput {
  restauranteId: string;
  nome: string;
  descricao: string | null;
  precoBundle: number; // em centavos
  imagemUrl: string | null;
  itens: Array<{
    produtoId: string;
    quantidade: number;
  }>;
}

export interface CriarComboOutput {
  combo: Combo;
  calculoDesconto: {
    precoIndividualTotal: number;
    precoBundle: number;
    valorDesconto: number;
    percentualDesconto: number;
  };
}

export class CriarComboUseCase implements UseCase<CriarComboInput, CriarComboOutput> {
  constructor(
    private itemCardapioRepo: IItemCardapioRepository,
    private comboRepo: IItemCardapioRepository, // ComboAggregate usa o mesmo repo de ItemCardapio
    private eventDispatcher: EventDispatcher
  ) {}

  async execute(input: CriarComboInput): Promise<CriarComboOutput> {
    // 1. Validar que há pelo menos um item
    if (!input.itens || input.itens.length === 0) {
      throw new Error('Combo deve ter pelo menos um item');
    }

    // 2. Buscar todos os produtos do combo para obter preços
    const produtoIds = input.itens.map((i) => i.produtoId);
    const produtos = await this.itemCardapioRepo.buscarPorIds(produtoIds);

    if (produtos.length !== produtoIds.length) {
      const encontrados = produtos.map((p) => p.id);
      const nãoEncontrados = produtoIds.filter((id) => !encontrados.includes(id));
      throw new Error(`Produtos não encontrados: ${nãoEncontrados.join(', ')}`);
    }

    // 3. Construir mapa de preços
    const precosItens = new Map<string, Dinheiro>();
    for (const produto of produtos) {
      precosItens.set(produto.id, produto.preco);
    }

    // 4. Criar ComboAggregate e definir preços
    const comboAggregate = ComboAggregate.criar({
      restauranteId: input.restauranteId,
      nome: input.nome,
      descricao: input.descricao,
      precoBundle: Dinheiro.criar(input.precoBundle),
      imagemUrl: input.imagemUrl,
      itens: input.itens,
      ativo: true,
    });

    comboAggregate.definirPrecoItens(produtos);

    // 5. Validar combo
    const validacao = comboAggregate.validarItens();
    if (!validacao.valido) {
      throw new Error(`Combo inválido: ${validacao.erros.join(', ')}`);
    }

    // 6. Calcular desconto para retorno
    const calculoDesconto = comboAggregate.calcularDesconto();

    // 7. Persistir combo (usando IItemCardapioRepository como repositório de combos)
    // O ComboAggregate usa Combo entity que é persistido via itemCardapioRepo
    // Na implementação real, precisaria de um IComboRepository dedicado
    const comboEntity = comboAggregate.comboEntity;
    const comboPersistido = await this.itemCardapioRepo.salvar(
      comboEntity as unknown as ItemCardapio
    );

    // 8. Disparar evento
    const evento = new CardapioAtualizadoEvent({
      tipoAlteracao: 'combo_criado',
      restauranteId: input.restauranteId,
      entidadeId: comboPersistido.id,
      entidade: comboPersistido as unknown as Combo,
    });
    this.eventDispatcher.dispatch(evento);

    // 9. Retornar combo criado com cálculo de desconto
    return {
      combo: comboPersistido as unknown as Combo,
      calculoDesconto: {
        precoIndividualTotal: calculoDesconto.precoIndividualTotal.valor,
        precoBundle: calculoDesconto.precoBundle.valor,
        valorDesconto: calculoDesconto.valorDesconto.valor,
        percentualDesconto: calculoDesconto.percentualDesconto,
      },
    };
  }
}
