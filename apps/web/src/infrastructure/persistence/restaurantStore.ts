'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { Restaurante, RestauranteProps } from '@/domain/admin/entities/Restaurante';
import { ListarRestaurantesDoOwnerUseCase } from '@/application/admin/services/ListarRestaurantesDoOwnerUseCase';
import { RestauranteRepository } from '@/infrastructure/persistence/admin/RestauranteRepository';
import { UsuarioRestauranteRepository } from '@/infrastructure/persistence/admin/UsuarioRestauranteRepository';
import { db } from '@/infrastructure/persistence/database';

// ── Types ───────────────────────────────────────────────────────────────────

export interface RestaurantState {
  restauranteSelecionado: RestauranteProps | null;
  restaurantesAcessiveis: RestauranteProps[];
  isLoading: boolean;
  error: string | null;
}

export interface RestaurantActions {
  setRestaurante: (restaurante: Restaurante) => void;
  limparSelecao: () => void;
  verificarAcesso: (usuarioId: string, restauranteId: string) => Promise<boolean>;
  carregarRestaurantes: (usuarioId: string) => Promise<void>;
}

export type RestaurantStore = RestaurantState & RestaurantActions;

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Converte Restaurante para RestauranteProps (serializável).
 * Usa getters públicos do domínio.
 */
function restauranteToProps(restaurante: Restaurante): RestauranteProps {
  return {
    id: restaurante.id,
    nome: restaurante.nome,
    cnpj: restaurante.cnpj,
    endereco: restaurante.endereco,
    telefone: restaurante.telefone,
    logoUrl: restaurante.logoUrl,
    ativo: restaurante.ativo,
    criadoEm: restaurante.criadoEm,
    atualizadoEm: restaurante.atualizadoEm,
    deletedAt: restaurante.deletedAt,
    version: restaurante.version,
  };
}

// ── Initial State ────────────────────────────────────────────────────────────

const initialState: RestaurantState = {
  restauranteSelecionado: null,
  restaurantesAcessiveis: [],
  isLoading: false,
  error: null,
};

// ── Store ───────────────────────────────────────────────────────────────────

export const useRestaurantStore = create<RestaurantStore>()(
  persist(
    immer((set, _get) => ({
      ...initialState,

      setRestaurante: (restaurante) =>
        set((state) => {
          state.restauranteSelecionado = restauranteToProps(restaurante);
          state.error = null;
        }),

      limparSelecao: () =>
        set((state) => {
          state.restauranteSelecionado = null;
        }),

      verificarAcesso: async (usuarioId: string, restauranteId: string): Promise<boolean> => {
        try {
          const usuarioRestauranteRepo = new UsuarioRestauranteRepository(db);
          const vinculo = await usuarioRestauranteRepo.findByUsuarioIdAndRestauranteId(
            usuarioId,
            restauranteId
          );
          return vinculo !== null;
        } catch (err) {
          console.error('Erro ao verificar acesso:', err);
          return false;
        }
      },

      carregarRestaurantes: async (usuarioId: string) => {
        set((state) => {
          state.isLoading = true;
          state.error = null;
        });

        try {
          const restauranteRepo = new RestauranteRepository(db);
          const usuarioRestauranteRepo = new UsuarioRestauranteRepository(db);

          const listarRestaurantesUseCase = new ListarRestaurantesDoOwnerUseCase(
            restauranteRepo,
            usuarioRestauranteRepo
          );

          const resultado = await listarRestaurantesUseCase.execute({ ownerId: usuarioId });

          if (resultado.sucesso) {
            const restaurantesProps = resultado.restaurantes.map((r) =>
              restauranteToProps(r.restaurante)
            );
            set((state) => {
              state.restaurantesAcessiveis = restaurantesProps;
              state.isLoading = false;
            });
          } else {
            set((state) => {
              state.error = 'Erro ao carregar restaurantes';
              state.isLoading = false;
            });
          }
        } catch (err) {
          console.error('Erro ao carregar restaurantes:', err);
          set((state) => {
            state.error = err instanceof Error ? err.message : 'Erro ao carregar restaurantes';
            state.isLoading = false;
          });
        }
      },
    })),
    {
      name: 'pedi-ai-restaurant',
      partialize: (state) => ({
        restauranteSelecionado: state.restauranteSelecionado,
      }),
    }
  )
);

// ── Selectors ───────────────────────────────────────────────────────────────

export const selectRestauranteSelecionado = (state: RestaurantStore) =>
  state.restauranteSelecionado;

export const selectRestaurantesAcessiveis = (state: RestaurantStore) =>
  state.restaurantesAcessiveis;

export const selectIsLoading = (state: RestaurantStore) => state.isLoading;

export const selectError = (state: RestaurantStore) => state.error;

export const selectTemRestauranteSelecionado = (state: RestaurantStore) =>
  state.restauranteSelecionado !== null;
