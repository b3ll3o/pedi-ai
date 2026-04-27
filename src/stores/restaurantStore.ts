'use client';

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export interface RestaurantInfo {
  id: string;
  name: string;
}

export interface RestaurantState {
  selectedRestaurantId: string | null;
  selectedRestaurantName: string | null;
}

export interface RestaurantActions {
  setRestaurante: (id: string, nome: string) => void;
  limparSelecao: () => void;
  verificarAcesso: (usuarioId: string) => boolean;
}

export type RestaurantStore = RestaurantState & RestaurantActions;

const initialState: RestaurantState = {
  selectedRestaurantId: null,
  selectedRestaurantName: null,
};

export const useRestaurantStore = create<RestaurantStore>()(
  immer((set, get) => ({
    ...initialState,

    setRestaurante: (id: string, nome: string) =>
      set((state) => {
        state.selectedRestaurantId = id;
        state.selectedRestaurantName = nome;
      }),

    limparSelecao: () =>
      set((state) => {
        state.selectedRestaurantId = null;
        state.selectedRestaurantName = null;
      }),

    verificarAcesso: (_usuarioId: string) => {
      const { selectedRestaurantId } = get();
      return selectedRestaurantId !== null;
    },
  }))
);
