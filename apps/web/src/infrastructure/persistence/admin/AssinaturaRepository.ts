import {
  Assinatura,
  AssinaturaProps,
  StatusAssinatura,
  TipoPlano,
} from '@/domain/admin/entities/Assinatura';
import { sql } from '@/infrastructure/database/pg-client';

/**
 * Interface para repositório de assinaturas
 */
export interface IAssinaturaRepository {
  buscarPorRestauranteId(restauranteId: string): Promise<Assinatura | null>;
  criar(assinatura: Assinatura): Promise<Assinatura>;
  atualizar(assinatura: Assinatura): Promise<Assinatura>;
  verificarTrialAtivo(restauranteId: string): Promise<boolean>;
  obterDiasRestantesTrial(restauranteId: string): Promise<number>;
}

interface SubscriptionRow {
  id: string;
  restaurant_id: string;
  status: string;
  plan_type: string;
  price_cents: number;
  currency: string;
  trial_started_at: string;
  trial_ends_at: string;
  trial_days: number;
  subscription_started_at: string | null;
  subscription_ends_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  version: number;
}

/**
 * Implementação do repositório de assinaturas usando PostgreSQL
 */
export class AssinaturaRepository implements IAssinaturaRepository {
  async buscarPorRestauranteId(restauranteId: string): Promise<Assinatura | null> {
    const result = await sql<SubscriptionRow>`
      SELECT id, restaurant_id, status, plan_type, price_cents, currency,
             trial_started_at, trial_ends_at, trial_days,
             subscription_started_at, subscription_ends_at,
             cancelled_at, created_at, updated_at, version
      FROM subscriptions
      WHERE restaurant_id = ${restauranteId}
      LIMIT 1
    `;

    if (result.length === 0) {
      return null;
    }

    return this.recordToAssinatura(result[0]);
  }

  async criar(assinatura: Assinatura): Promise<Assinatura> {
    const record = this.assinaturaToRecord(assinatura);

    await sql`
      INSERT INTO subscriptions (
        id, restaurant_id, status, plan_type, price_cents, currency,
        trial_started_at, trial_ends_at, trial_days,
        subscription_started_at, subscription_ends_at,
        cancelled_at, created_at, updated_at, version
      ) VALUES (
        ${record.id}, ${record.restaurant_id}, ${record.status}, ${record.plan_type},
        ${record.price_cents}, ${record.currency},
        ${record.trial_started_at}, ${record.trial_ends_at}, ${record.trial_days},
        ${record.subscription_started_at}, ${record.subscription_ends_at},
        ${record.cancelled_at}, ${record.created_at}, ${record.updated_at}, ${record.version}
      )
    `;

    return assinatura;
  }

  async atualizar(assinatura: Assinatura): Promise<Assinatura> {
    const record = this.assinaturaToRecord(assinatura);

    await sql`
      UPDATE subscriptions SET
        status = ${record.status},
        plan_type = ${record.plan_type},
        price_cents = ${record.price_cents},
        currency = ${record.currency},
        trial_started_at = ${record.trial_started_at},
        trial_ends_at = ${record.trial_ends_at},
        trial_days = ${record.trial_days},
        subscription_started_at = ${record.subscription_started_at},
        subscription_ends_at = ${record.subscription_ends_at},
        cancelled_at = ${record.cancelled_at},
        updated_at = ${record.updated_at},
        version = ${record.version}
      WHERE id = ${record.id}
    `;

    return assinatura;
  }

  async verificarTrialAtivo(restauranteId: string): Promise<boolean> {
    const assinatura = await this.buscarPorRestauranteId(restauranteId);

    if (!assinatura) {
      return false;
    }

    return assinatura.períodoAtivo;
  }

  async obterDiasRestantesTrial(restauranteId: string): Promise<number> {
    const assinatura = await this.buscarPorRestauranteId(restauranteId);

    if (!assinatura) {
      return 0;
    }

    return assinatura.diasRestantesTrial;
  }

  /**
   * Converte record do banco para entidade Assinatura
   */
  private recordToAssinatura(record: SubscriptionRow): Assinatura {
    const props: AssinaturaProps = {
      id: record.id,
      restauranteId: record.restaurant_id,
      status: record.status as StatusAssinatura,
      tipoPlano: record.plan_type as TipoPlano,
      preçoCentavos: record.price_cents,
      moeda: record.currency,
      trialIniciadoEm: new Date(record.trial_started_at),
      trialExpiraEm: new Date(record.trial_ends_at),
      trialDias: record.trial_days,
      assinaturaIniciadaEm: record.subscription_started_at
        ? new Date(record.subscription_started_at)
        : null,
      assinaturaExpiraEm: record.subscription_ends_at
        ? new Date(record.subscription_ends_at)
        : null,
      canceladaEm: record.cancelled_at ? new Date(record.cancelled_at) : null,
      criadoEm: new Date(record.created_at),
      atualizadoEm: new Date(record.updated_at),
      versão: record.version,
    };

    return Assinatura.reconstruir(props);
  }

  /**
   * Converte entidade Assinatura para record do banco
   */
  private assinaturaToRecord(assinatura: Assinatura): Omit<SubscriptionRow, never> {
    return assinatura.toRecord() as Omit<SubscriptionRow, never>;
  }
}
