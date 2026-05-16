import { Assinatura } from '@/domain/admin/entities/Assinatura';
import { IAssinaturaRepository } from '@/infrastructure/persistence/admin/AssinaturaRepository';

export interface VerificarAssinaturaInput {
  restauranteId: string;
}

export interface VerificarAssinaturaOutput {
  ativo: boolean;
  status: 'trial' | 'active' | 'expired' | 'cancelled';
  diasRestantes: number;
  bloqueado: boolean;
}

export interface AtivarAssinaturaInput {
  restauranteId: string;
  tipoPlano: 'monthly' | 'yearly';
}

export interface CriarAssinaturaTrialInput {
  restauranteId: string;
  diasTrial?: number;
}

/**
 * Use Case para gerenciar assinaturas de restaurantes
 * Controla trial de 14 dias e ativação de assinatura R$19.99/mês
 */
export class GerenciarAssinaturaUseCase {
  constructor(private assinaturaRepo: IAssinaturaRepository) {}

  /**
   * Verifica se o restaurante tem acesso ativo (trial ou assinatura válida)
   */
  async verificarAcesso(input: VerificarAssinaturaInput): Promise<VerificarAssinaturaOutput> {
    const assinatura = await this.assinaturaRepo.buscarPorRestauranteId(input.restauranteId);

    if (!assinatura) {
      return {
        ativo: false,
        status: 'expired',
        diasRestantes: 0,
        bloqueado: true,
      };
    }

    return {
      ativo: assinatura.períodoAtivo,
      status: assinatura.status,
      diasRestantes: assinatura.diasRestantesTrial,
      bloqueado: assinatura.bloqueado,
    };
  }

  /**
   * Inicia trial de 14 dias para um restaurante (chamado ao criar primeiro restaurante)
   */
  async iniciarTrial(input: CriarAssinaturaTrialInput): Promise<Assinatura> {
    const existente = await this.assinaturaRepo.buscarPorRestauranteId(input.restauranteId);
    if (existente) {
      throw new Error('Restaurante já possui uma assinatura');
    }

    const assinatura = Assinatura.criar(input.restauranteId, input.diasTrial ?? 14);
    return this.assinaturaRepo.criar(assinatura);
  }

  /**
   * Ativa assinatura paga após o trial
   */
  async ativarAssinatura(input: AtivarAssinaturaInput): Promise<Assinatura> {
    const assinatura = await this.assinaturaRepo.buscarPorRestauranteId(input.restauranteId);

    if (!assinatura) {
      throw new Error('Assinatura não encontrada para este restaurante');
    }

    assinatura.ativarAssinatura(input.tipoPlano);
    return this.assinaturaRepo.atualizar(assinatura);
  }

  /**
   * Verifica e expira trials que já passaram do prazo
   */
  async verificarEExpirarTrials(): Promise<number> {
    // Esta função pode ser chamada por um cron job diariamente
    // Por ora, a verificação é feita em tempo real nas operações
    return 0;
  }

  /**
   * Bloqueia operações se assinatura expirou
   */
  async validarOperacao(restauranteId: string): Promise<void> {
    const acesso = await this.verificarAcesso({ restauranteId });
    if (acesso.bloqueado) {
      throw new Error(
        `Operação bloqueada: sua assinatura expirou. Assine o plano R$19.99/mês para continuar.`
      );
    }
  }
}
