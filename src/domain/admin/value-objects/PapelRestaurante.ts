export type PapelRestaurante = 'owner' | 'manager' | 'staff';

export const PapelRestauranteHelpers = {
  isOwner: (p: PapelRestaurante): boolean => p === 'owner',
  isManager: (p: PapelRestaurante): boolean => p === 'manager',
  isStaff: (p: PapelRestaurante): boolean => p === 'staff',
} as const;
