/**
 * useEstatisticas Hook
 * Hook para obter estatísticas do restaurante usando ObterEstatisticasUseCase.
 */

import { useState, useEffect } from 'react';
import { db } from '@/infrastructure/persistence/database';
import { EstatisticasRepository } from '@/infrastructure/persistence/admin/EstatisticasRepository';
import { PedidoRepository } from '@/infrastructure/persistence/pedido/PedidoRepository';
import { PagamentoRepository } from '@/infrastructure/persistence/pagamento/PagamentoRepository';
import { ObterEstatisticasUseCase, type Periodo, type Estatisticas } from '@/application/admin/services/ObterEstatisticasUseCase';

// Instanciar repositories
const estatisticasRepo = new EstatisticasRepository(db);
const pedidoRepo = new PedidoRepository(db);
const pagamentoRepo = new PagamentoRepository(db);

// Instanciar use case
const obterEstatisticasUseCase = new ObterEstatisticasUseCase(pedidoRepo, pagamentoRepo);

export interface UseEstatisticasResult {
  dados: Estatisticas | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Hook para obter estatísticas agregadas do restaurante.
 * Usa ObterEstatisticasUseCase do application layer.
 *
 * @param restauranteId - ID do restaurante
 * @param periodo - Período para filtrar estatísticas ('dia' | 'semana' | 'mes' | 'ano')
 * @returns Objeto com dados, loading e error
 */
export function useEstatisticas(restauranteId: string, periodo: Periodo): UseEstatisticasResult {
  const [dados, setDados] = useState<Estatisticas | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchEstatisticas() {
      if (!restauranteId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const resultado = await obterEstatisticasUseCase.execute({
          restauranteId,
          periodo,
        });

        if (mounted) {
          setDados(resultado);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Erro ao obter estatísticas'));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchEstatisticas();

    return () => {
      mounted = false;
    };
  }, [restauranteId, periodo]);

  return { dados, loading, error };
}
