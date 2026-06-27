/**
 * @spec(RF-ADM-FF-10, RNF-I18N-FF-01)
 *
 * Testes do componente `TabelaFeatureFlags` (apps/web/src/components/admin/feature-flags/TabelaFeatureFlags.tsx).
 * Foco em: render da tabela, toggle acessível, RBAC visual (manager sem botão).
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// @ts-expect-error — módulo ainda não implementado (TDD: RED)
import { TabelaFeatureFlags } from '@/components/admin/feature-flags/TabelaFeatureFlags';

const flagsMock = [
  {
    key: 'pix_enabled',
    description: 'Habilita PIX',
    valueType: 'BOOLEAN',
    defaultValue: false,
    enabled: true,
    overrideCount: 2,
  },
  {
    key: 'combos_enabled',
    description: 'Habilita combos',
    valueType: 'BOOLEAN',
    defaultValue: true,
    enabled: false,
    overrideCount: 0,
  },
];

describe('TabelaFeatureFlags (RF-ADM-FF-10)', () => {
  it('renderiza uma linha por flag com data-testid', () => {
    render(<TabelaFeatureFlags flags={flagsMock} role="owner" onToggle={vi.fn()} />);

    expect(screen.getAllByTestId('feature-flag-row')).toHaveLength(2);
    expect(screen.getByText('pix_enabled')).toBeInTheDocument();
    expect(screen.getByText('combos_enabled')).toBeInTheDocument();
  });

  it('mostra contagem de overrides por linha', () => {
    render(<TabelaFeatureFlags flags={flagsMock} role="owner" onToggle={vi.fn()} />);

    expect(screen.getByText('2')).toBeInTheDocument(); // overrideCount de pix
  });

  it('toggle é clicável para owner e dispara onToggle', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<TabelaFeatureFlags flags={flagsMock} role="owner" onToggle={onToggle} />);

    const toggles = screen.getAllByTestId('flag-toggle');
    await user.click(toggles[0]);

    expect(onToggle).toHaveBeenCalledWith('pix_enabled', expect.any(Boolean));
  });

  it('toggle fica desabilitado para manager (RNF-SEC-FF-01)', () => {
    render(<TabelaFeatureFlags flags={flagsMock} role="manager" onToggle={vi.fn()} />);

    const toggles = screen.getAllByTestId('flag-toggle');
    toggles.forEach((toggle) => {
      expect(toggle).toBeDisabled();
    });
  });

  it('exibe tooltip "Propagação pode levar até 30 s" para owner', () => {
    render(<TabelaFeatureFlags flags={flagsMock} role="owner" onToggle={vi.fn()} />);

    expect(screen.getByText(/propagação.*30.*segundos/i)).toBeInTheDocument();
  });

  it('labels em pt-BR (RNF-I18N-FF-01)', () => {
    render(<TabelaFeatureFlags flags={flagsMock} role="owner" onToggle={vi.fn()} />);

    // Verifica que strings pt-BR estão presentes
    expect(screen.getByText(/chave/i)).toBeInTheDocument();
    expect(screen.getByText(/descrição/i)).toBeInTheDocument();
    expect(screen.getByText(/tipo/i)).toBeInTheDocument();
    expect(screen.getByText(/overrides/i)).toBeInTheDocument();
  });
});
