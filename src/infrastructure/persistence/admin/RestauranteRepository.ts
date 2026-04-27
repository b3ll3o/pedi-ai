import { PediDatabase, RestauranteRecord } from '../database';
import { IRestauranteRepository } from '@/domain/admin/repositories/IRestauranteRepository';
import { Restaurante } from '@/domain/admin/entities/Restaurante';
import { ConfiguracoesRestaurante } from '@/domain/admin/value-objects/ConfiguracoesRestaurante';
import { UsuarioRestauranteRepository } from './UsuarioRestauranteRepository';

/**
 * Implementação do repositório de restaurantes usando Dexie (IndexedDB)
 */
export class RestauranteRepository implements IRestauranteRepository {
  constructor(private db: PediDatabase) {}

  async create(restaurante: Restaurante, configuracoes: ConfiguracoesRestaurante): Promise<Restaurante> {
    const record: RestauranteRecord = {
      id: restaurante.id,
      nome: restaurante.nome,
      cnpj: restaurante.cnpj,
      endereco: restaurante.endereco,
      telefone: restaurante.telefone,
      logoUrl: restaurante.logoUrl,
      ativo: restaurante.ativo,
      criadoEm: restaurante.criadoEm,
      atualizadoEm: restaurante.atualizadoEm,
    };

    await this.db.restaurantes.add(record);

    // Salvar configurações separadamente (em uma tabela de configurações)
    await this.db.table('configuracoes_restaurante').put({
      restauranteId: restaurante.id,
      permitePedidoOnline: configuracoes.permitePedidoOnline,
      permiteReserva: configuracoes.permiteReserva,
      tempoPreparoMinutos: configuracoes.tempoPreparoMinutos,
      taxaEntrega: configuracoes.taxaEntrega,
      valorMinimoPedido: configuracoes.valorMinimoPedido,
      modoOperacao: configuracoes.modoOperacao,
      horariosFuncionamento: configuracoes.horariosFuncionamento,
    });

    return restaurante;
  }

  async findById(id: string): Promise<Restaurante | null> {
    const record = await this.db.restaurantes.get(id);
    if (!record) return null;
    return this.recordToRestaurante(record);
  }

  async findByCNPJ(cnpj: string): Promise<Restaurante | null> {
    const record = await this.db.restaurantes.where('cnpj').equals(cnpj).first();
    if (!record) return null;
    return this.recordToRestaurante(record);
  }

  async update(restaurante: Restaurante, configuracoes: ConfiguracoesRestaurante): Promise<Restaurante> {
    const record: RestauranteRecord = {
      id: restaurante.id,
      nome: restaurante.nome,
      cnpj: restaurante.cnpj,
      endereco: restaurante.endereco,
      telefone: restaurante.telefone,
      logoUrl: restaurante.logoUrl,
      ativo: restaurante.ativo,
      criadoEm: restaurante.criadoEm,
      atualizadoEm: restaurante.atualizadoEm,
    };

    await this.db.restaurantes.put(record);

    // Atualizar configurações
    await this.db.table('configuracoes_restaurante').put({
      restauranteId: restaurante.id,
      permitePedidoOnline: configuracoes.permitePedidoOnline,
      permiteReserva: configuracoes.permiteReserva,
      tempoPreparoMinutos: configuracoes.tempoPreparoMinutos,
      taxaEntrega: configuracoes.taxaEntrega,
      valorMinimoPedido: configuracoes.valorMinimoPedido,
      modoOperacao: configuracoes.modoOperacao,
      horariosFuncionamento: configuracoes.horariosFuncionamento,
    });

    return restaurante;
  }

  async delete(id: string): Promise<void> {
    await this.db.restaurantes.delete(id);
    // Remover configurações associadas
    await this.db.table('configuracoes_restaurante').delete(id);
  }

  async findAtivo(): Promise<Restaurante | null> {
    const records = await this.db.restaurantes.toArray();
    const record = records.find(r => r.ativo === true);
    if (!record) return null;
    return this.recordToRestaurante(record);
  }

  async findByUsuarioId(usuarioId: string): Promise<Restaurante[]> {
    const usuarioRestauranteRepo = new UsuarioRestauranteRepository(this.db);
    const vinculos = await usuarioRestauranteRepo.findByUsuarioId(usuarioId);
    
    if (vinculos.length === 0) return [];

    const restaurantIds = vinculos.map(v => v.restauranteId);
    const records = await this.db.restaurantes
      .where('id')
      .anyOf(restaurantIds)
      .toArray();
    
    return records.map(r => this.recordToRestaurante(r));
  }

  private recordToRestaurante(record: RestauranteRecord): Restaurante {
    return Restaurante.reconstruir({
      id: record.id,
      nome: record.nome,
      cnpj: record.cnpj,
      endereco: record.endereco,
      telefone: record.telefone,
      logoUrl: record.logoUrl,
      ativo: record.ativo,
      criadoEm: record.criadoEm,
      atualizadoEm: record.atualizadoEm,
    });
  }
}
