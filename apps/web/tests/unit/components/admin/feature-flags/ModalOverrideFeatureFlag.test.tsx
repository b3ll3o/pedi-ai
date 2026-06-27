/**
 * @spec(RF-ADM-FF-05, RF-ADM-FF-06, RF-ADM-FF-10, RNF-SEC-FF-01)
 *
 * Testes do `ModalOverrideFeatureFlag`.
 * Foco em: validação Zod, confirmação destrutiva, RBAC visual.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// @ts-expect-error — módulo ainda não implementado (TDD: RED)
import { ModalOverrideFeatureFlag } from '@/components/admin/feature-flags/ModalOverrideFeatureFlag';

describe('ModalOverrideFeatureFlag (RF-ADM-FF-05/06)', () => {
  it('renderiza modal com campos scope, scopeId, value, rolloutPct, expiresAt', () => {
    render(
      <ModalOverrideFeatureFlag
        open
        flagKey="pix_enabled"
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        role="owner"
      />
    );

    expect(screen.getByLabelText(/escopo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/scopeId/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/valor/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/rollout/i)).toBeInTheDocument();
  });

  it('rejeita scope=GLOBAL com scopeId preenchido (validação client-side)', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <ModalOverrideFeatureFlag
        open
        flagKey="pix_enabled"
        onClose={vi.fn()}
        onSubmit={onSubmit}
        role="owner"
      />
    );

    await user.selectOptions(screen.getByLabelText(/escopo/i), 'GLOBAL');
    await user.type(screen.getByLabelText(/scopeId/i), 'qualquer');
    await user.click(screen.getByTestId('btn-salvar-override'));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/scopeId deve ser nulo para GLOBAL/i)).toBeInTheDocument();
  });

  it('manager NÃO vê botão "Salvar" (RBAC visual)', () => {
    render(
      <ModalOverrideFeatureFlag
        open
        flagKey="pix_enabled"
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        role="manager"
      />
    );

    expect(screen.queryByTestId('btn-salvar-override')).not.toBeInTheDocument();
    expect(screen.getByText(/apenas owner/i)).toBeInTheDocument();
  });

  it('exige confirmação ao excluir override', async () => {
    const user = userEvent.setup();
    render(
      <ModalOverrideFeatureFlag
        open
        flagKey="pix_enabled"
        existingOverride={{ id: 'ov_1', scope: 'RESTAURANT', scopeId: 'r1' }}
        onClose={vi.fn()}
        onDelete={vi.fn()}
        onSubmit={vi.fn()}
        role="owner"
      />
    );

    await user.click(screen.getByTestId('btn-excluir-override'));
    expect(screen.getByText(/tem certeza/i)).toBeInTheDocument();
  });
});
