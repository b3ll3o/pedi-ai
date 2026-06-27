/**
 * @spec(RF-ADM-FF-03, RF-ADM-FF-10)
 *
 * Testes do PainelFeatureFlags com integração do ModalCriarFlag + ToastProvider.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { PainelFeatureFlags } from '@/components/admin/feature-flags/PainelFeatureFlags';
import { ToastProvider } from '@/lib/notification';

describe('PainelFeatureFlags — botão + Nova (RF-ADM-FF-03)', () => {
  beforeEach(() => {
    // Mock fetch para listagem de flags
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: [] }),
    }) as never;
  });

  it('owner: botão habilitado abre ModalCriarFlag', async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <PainelFeatureFlags role="owner" />
      </ToastProvider>
    );

    const btn = await screen.findByTestId('btn-criar-flag');
    expect(btn).not.toBeDisabled();

    await user.click(btn);
    expect(screen.getByRole('dialog', { name: /nova feature flag/i })).toBeInTheDocument();
  });

  it('manager: botão desabilitado com tooltip "Apenas owner pode criar flags"', async () => {
    render(
      <ToastProvider>
        <PainelFeatureFlags role="manager" />
      </ToastProvider>
    );
    const btn = await screen.findByTestId('btn-criar-flag');
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('title', expect.stringMatching(/apenas owner/i));
  });
});
