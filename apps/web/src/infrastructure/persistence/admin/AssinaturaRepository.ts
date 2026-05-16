import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  Assinatura,
  AssinaturaProps,
  StatusAssinatura,
  TipoPlano,
} from '@/domain/admin/entities/Assinatura';
import type { Database } from '@/lib/supabase/database.types';

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

/**
 * Implementação do repositório de assinaturas usando Supabase
 */
export class AssinaturaRepository implements IAssinaturaRepository {
  private supabase: SupabaseClient<Database>;

  constructor(supabaseClient?: SupabaseClient<Database>) {
    this.supabase =
      supabaseClient ||
      createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false,
          },
        }
      );
  }

  async buscarPorRestauranteId(restauranteId: string): Promise<Assinatura | null> {
    const { data, error } = await this.supabase
      .from('subscriptions')
      .select('*')
      .eq('restaurant_id', restauranteId)
      .single();

    if (error || !data) {
      return null;
    }

    return this.recordToAssinatura(data);
  }

  async criar(assinatura: Assinatura): Promise<Assinatura> {
    const { data, error } = await this.supabase
      .from('subscriptions')
      .insert(this.assinaturaToRecord(assinatura))
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar assinatura:', error);
      throw new Error('Falha ao criar assinatura');
    }

    return this.recordToAssinatura(data);
  }

  async atualizar(assinatura: Assinatura): Promise<Assinatura> {
    const { data, error } = await this.supabase
      .from('subscriptions')
      .update(this.assinaturaToRecord(assinatura))
      .eq('id', assinatura.id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar assinatura:', error);
      throw new Error('Falha ao atualizar assinatura');
    }

    return this.recordToAssinatura(data);
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
  private recordToAssinatura(
    record: Database['public']['Tables']['subscriptions']['Row']
  ): Assinatura {
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
  private assinaturaToRecord(
    assinatura: Assinatura
  ): Database['public']['Tables']['subscriptions']['Insert'] {
    return assinatura.toRecord() as Database['public']['Tables']['subscriptions']['Insert'];
  }
}
