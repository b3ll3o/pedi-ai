import { UseCase } from '@/application/shared';
import { Mesa } from '@/domain/mesa/entities/Mesa';
import { QRCodePayload, IQRCodeValidationService } from '@/domain/mesa';

/**
 * Input para gerenciar mesa
 */
export interface MesaInput {
  acao: 'criar' | 'atualizar' | 'excluir' | 'ativar' | 'desativar';
  id?: string;
  restauranteId: string;
  label?: string;
}

/**
 * Output após gerenciar mesa
 */
export interface MesaOutput {
  mesa?: Mesa;
  sucesso: boolean;
}

/**
 * Use Case para CRUD de mesas
 */
export class GerenciarMesaUseCase implements UseCase<MesaInput, MesaOutput> {
  constructor(
    private mesaRepo: {
      create(mesa: Mesa): Promise<Mesa>;
      findById(id: string): Promise<Mesa | null>;
      findByRestauranteId(restauranteId: string): Promise<Mesa[]>;
      findByLabel(restauranteId: string, label: string): Promise<Mesa | null>;
      update(mesa: Mesa): Promise<Mesa>;
      delete(id: string): Promise<void>;
    },
    private qrCodeValidationService: IQRCodeValidationService
  ) {}

  async execute(input: MesaInput): Promise<MesaOutput> {
    switch (input.acao) {
      case 'criar':
        return this.criar(input);
      case 'atualizar':
        return this.atualizar(input);
      case 'excluir':
        return this.excluir(input);
      case 'ativar':
        return this.ativar(input);
      case 'desativar':
        return this.desativar(input);
      default:
        throw new Error(`Ação desconhecida: ${input.acao}`);
    }
  }

  private async criar(input: MesaInput): Promise<MesaOutput> {
    if (!input.label) {
      throw new Error('Label é obrigatório para criar mesa');
    }

    // Verificar se label já existe para este restaurante
    const existente = await this.mesaRepo.findByLabel(input.restauranteId, input.label);
    if (existente) {
      throw new Error('Já existe uma mesa com este label');
    }

    // Gerar ID para a mesa antes de criar o QR code payload
    const mesaId = crypto.randomUUID();

    // Gerar QR code payload usando o serviço de validação
    const assinatura = this.qrCodeValidationService.gerarAssinatura(
      input.restauranteId,
      mesaId,
      process.env.QR_CODE_SECRET || 'pedi-ai-secret'
    );
    const qrCodePayload = QRCodePayload.reconstruir({
      restauranteId: input.restauranteId,
      mesaId,
      assinatura,
    });

    const mesa = Mesa.criar({
      id: mesaId,
      restauranteId: input.restauranteId,
      label: input.label,
      qrCodePayload,
      ativo: true,
    });

    const mesaPersistida = await this.mesaRepo.create(mesa);

    return { mesa: mesaPersistida, sucesso: true };
  }

  private async atualizar(input: MesaInput): Promise<MesaOutput> {
    if (!input.id) {
      throw new Error('ID é obrigatório para atualizar mesa');
    }

    const mesa = await this.mesaRepo.findById(input.id);
    if (!mesa) {
      throw new Error('Mesa não encontrada');
    }

    if (input.label && input.label !== mesa.label) {
      // Verificar se o novo label não está em uso
      const existente = await this.mesaRepo.findByLabel(mesa.restauranteId, input.label);
      if (existente && existente.id !== mesa.id) {
        throw new Error('Já existe uma mesa com este label');
      }

      // Apenas atualizar o label - o QR code payload usa o ID da mesa, não o label
      mesa.atualizarLabel(input.label);
    }

    const mesaAtualizada = await this.mesaRepo.update(mesa);

    return { mesa: mesaAtualizada, sucesso: true };
  }

  private async excluir(input: MesaInput): Promise<MesaOutput> {
    if (!input.id) {
      throw new Error('ID é obrigatório para excluir mesa');
    }

    await this.mesaRepo.delete(input.id);

    return { sucesso: true };
  }

  private async ativar(input: MesaInput): Promise<MesaOutput> {
    if (!input.id) {
      throw new Error('ID é obrigatório para ativar mesa');
    }

    const mesa = await this.mesaRepo.findById(input.id);
    if (!mesa) {
      throw new Error('Mesa não encontrada');
    }

    mesa.ativar();
    const mesaAtualizada = await this.mesaRepo.update(mesa);

    return { mesa: mesaAtualizada, sucesso: true };
  }

  private async desativar(input: MesaInput): Promise<MesaOutput> {
    if (!input.id) {
      throw new Error('ID é obrigatório para desativar mesa');
    }

    const mesa = await this.mesaRepo.findById(input.id);
    if (!mesa) {
      throw new Error('Mesa não encontrada');
    }

    mesa.desativar();
    const mesaAtualizada = await this.mesaRepo.update(mesa);

    return { mesa: mesaAtualizada, sucesso: true };
  }
}
