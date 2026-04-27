export type PapelRestaurante = 'dono' | 'gerente' | 'atendente';

export const PapelRestauranteHelpers = {
  isOwner: (p: PapelRestaurante): boolean => p === 'dono',
  isManager: (p: PapelRestaurante): boolean => p === 'gerente',
  isStaff: (p: PapelRestaurante): boolean => p === 'atendente',
} as const;
