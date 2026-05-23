'use client';

import { type RestaurantFormMode } from './RestaurantForm';

interface FormTitleProps {
  mode: RestaurantFormMode;
}

export function FormTitle({ mode }: FormTitleProps) {
  return (
    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>
      {mode === 'edit' ? 'Editar Restaurante' : 'Novo Restaurante'}
    </h2>
  );
}

interface SubmitButtonProps {
  isSubmitting: boolean;
  mode: RestaurantFormMode;
}

export function SubmitButton({ isSubmitting, mode }: SubmitButtonProps) {
  const label = isSubmitting ? 'Salvando...' : mode === 'edit' ? 'Salvar' : 'Criar';
  return <>{label}</>;
}
