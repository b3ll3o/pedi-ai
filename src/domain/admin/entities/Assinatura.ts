import { EntityClass } from '@/domain/shared';

/**
 * Status possíveis de uma assinatura
 */
export type StatusAssinatura = 'trial' | 'active' | 'expired' | 'cancelled';

/**
 * Tipo de plano de assinatura
 */
export type TipoPlano = 'monthly' | 'yearly';

/**
 * Props da entidade Assinatura
 */
export interface AssinaturaProps {
  id: string;
  restauranteId: string;
  status: StatusAssinatura;
  tipoPlano: TipoPlano;
  preçoCentavos: number;
  moeda: string;
  trialIniciadoEm: Date;
  trialExpiraEm: Date;
  trialDias: number;
  assinaturaIniciadaEm: Date | null;
  assinaturaExpiraEm: Date | null;
  canceladaEm: Date | null;
  criadoEm: Date;
  atualizadoEm: Date;
  versão: number;
}

/**
 * Entidade de Assinatura
 * Gerencia o ciclo de vida da assinatura do restaurante (trial e assinatura ativa)
 * 
 * Regras de negócio:
 * - Todo restaurante começa com trial de 14 dias
 * - Trial expira 14 dias após criação do primeiro restaurante
 * - Após trial, restaurante precisa assinar (R$19.99/mês) ou é bloqueado
 * - Operações de escrita são bloqueadas se assinatura expirada
 */
export class Assinatura extends EntityClass<AssinaturaProps> {
  /**
   * Verifica se o trial está ativo
   */
  get trialAtivo(): boolean {
    return this.props.status === 'trial' && new Date() < this.props.trialExpiraEm;
  }

  /**
   * Verifica se a assinatura está ativa
   */
  get assinaturaAtiva(): boolean {
    return this.props.status === 'active' && 
           this.props.assinaturaExpiraEm !== null && 
           new Date() < this.props.assinaturaExpiraEm;
  }

  /**
   * Verifica se o período experimental (trial ou assinatura válida) está ativo
   */
  get períodoAtivo(): boolean {
    return this.trialAtivo || this.assinaturaAtiva;
  }

  /**
   * Dias restantes no trial
   */
  get diasRestantesTrial(): number {
    if (!this.trialAtivo) return 0;
    const agora = new Date();
    const expira = new Date(this.props.trialExpiraEm);
    const diffMs = expira.getTime() - agora.getTime();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }

  /**
   * Preço formatado em reais
   */
  get preçoFormatado(): string {
    const reais = this.props.preçoCentavos / 100;
    return `R$ ${reais.toFixed(2).replace('.', ',')}`;
  }

  /**
   * Verifica se está bloqueado (trial e assinatura expirados)
   */
  get bloqueado(): boolean {
    return !this.períodoAtivo;
  }

  /**
   * Status atual da assinatura
   */
  get status(): StatusAssinatura {
    return this.props.status;
  }

  /**
   * ID do restaurante dono da assinatura
   */
  get restauranteId(): string {
    return this.props.restauranteId;
  }

  /**
   * Converte a entidade para um record do banco de dados
   */
  toRecord(): Record<string, unknown> {
    return {
      id: this.id,
      restaurant_id: this.props.restauranteId,
      status: this.props.status,
      plan_type: this.props.tipoPlano,
      price_cents: this.props.preçoCentavos,
      currency: this.props.moeda,
      trial_started_at: this.props.trialIniciadoEm.toISOString(),
      trial_ends_at: this.props.trialExpiraEm.toISOString(),
      trial_days: this.props.trialDias,
      subscription_started_at: this.props.assinaturaIniciadaEm?.toISOString() ?? null,
      subscription_ends_at: this.props.assinaturaExpiraEm?.toISOString() ?? null,
      cancelled_at: this.props.canceladaEm?.toISOString() ?? null,
      created_at: this.props.criadoEm.toISOString(),
      updated_at: this.props.atualizadoEm.toISOString(),
      version: this.props.versão,
    };
  }

  /**
   * Inicia o trial para o restaurante
   */
  iniciarTrial(dias: number = 14): void {
    const agora = new Date();
    const expira = new Date(agora.getTime() + dias * 24 * 60 * 60 * 1000);
    
    Object.assign(this.props, {
      status: 'trial',
      trialIniciadoEm: agora,
      trialExpiraEm: expira,
      trialDias: dias,
    });
  }

  /**
   * Ativa a assinatura após o trial
   */
  ativarAssinatura(tipoPlano: TipoPlano = 'monthly'): void {
    const agora = new Date();
    let expira: Date;

    if (tipoPlano === 'monthly') {
      expira = new Date(agora.getTime() + 30 * 24 * 60 * 60 * 1000);
    } else {
      expira = new Date(agora.getTime() + 365 * 24 * 60 * 60 * 1000);
    }

    Object.assign(this.props, {
      status: 'active',
      tipoPlano,
      assinaturaIniciadaEm: agora,
      assinaturaExpiraEm: expira,
    });
  }

  /**
   * Marca a assinatura como expirada
   */
  expirar(): void {
    if (this.props.status === 'trial') {
      Object.assign(this.props, { status: 'expired' });
    }
  }

  /**
   * Cancela a assinatura (mantém acesso até o fim do período pago)
   */
  cancelar(): void {
    Object.assign(this.props, {
      status: 'cancelled',
      canceladaEm: new Date(),
    });
  }

  /**
   * Atualiza o timestamp de atualização
   */
  marcarAtualizado(): void {
    Object.assign(this.props, { atualizadoEm: new Date() });
  }

  equals(other: EntityClass<AssinaturaProps>): boolean {
    if (!(other instanceof Assinatura)) return false;
    return this.id === other.id;
  }

  /**
   * Cria uma nova assinatura com trial de 14 dias
   */
  static criar(restauranteId: string, diasTrial: number = 14): Assinatura {
    const agora = new Date();
    const trialExpira = new Date(agora.getTime() + diasTrial * 24 * 60 * 60 * 1000);

    return new Assinatura({
      id: crypto.randomUUID(),
      restauranteId,
      status: 'trial',
      tipoPlano: 'monthly',
      preçoCentavos: 1999, // R$19.99
      moeda: 'BRL',
      trialIniciadoEm: agora,
      trialExpiraEm: trialExpira,
      trialDias: diasTrial,
      assinaturaIniciadaEm: null,
      assinaturaExpiraEm: null,
      canceladaEm: null,
      criadoEm: agora,
      atualizadoEm: agora,
      versão: 1,
    } as AssinaturaProps);
  }

  /**
   * Reconstrói uma assinatura a partir dos dados do banco
   */
  static reconstruir(props: AssinaturaProps): Assinatura {
    return new Assinatura(props);
  }
}
