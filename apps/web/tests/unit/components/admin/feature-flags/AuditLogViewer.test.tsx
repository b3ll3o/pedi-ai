/**
 * @spec(RF-ADM-FF-09, RF-ADM-FF-10, RNF-I18N-FF-01)
 *
 * Testes do `AuditLogViewer` (componente).
 * Foco em: render da lista, timestamps relativos em pt-BR, diff before/after.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

// @ts-expect-error — módulo ainda não implementado (TDD: RED)
import { AuditLogViewer } from '@/components/admin/feature-flags/AuditLogViewer';

const auditEntriesMock = [
  {
    id: 'a3',
    actorId: 'owner_1',
    action: 'UPDATE',
    before: { enabled: true },
    after: { enabled: false },
    createdAt: new Date(Date.now() - 30_000).toISOString(), // 30s atrás
  },
  {
    id: 'a2',
    actorId: 'owner_1',
    action: 'OVERRIDE_ADD',
    before: null,
    after: { scope: 'RESTAURANT', value: true },
    createdAt: new Date(Date.now() - 5 * 60_000).toISOString(), // 5min atrás
  },
];

describe('AuditLogViewer (RF-ADM-FF-09)', () => {
  it('renderiza uma linha por entrada de audit', () => {
    render(<AuditLogViewer entries={auditEntriesMock} />);

    const items = screen.getAllByTestId('audit-entry');
    expect(items).toHaveLength(2);
  });

  it('exibe timestamps relativos em pt-BR (RF-ADM-FF-10)', () => {
    render(<AuditLogViewer entries={auditEntriesMock} />);

    // 30 segundos → "há 30 segundos"; 5 minutos → "há 5 minutos"
    expect(screen.getByText(/há 30 segund/i)).toBeInTheDocument();
    expect(screen.getByText(/há 5 minut/i)).toBeInTheDocument();
  });

  it('exibe diff before → after em JSON formatado', () => {
    render(<AuditLogViewer entries={auditEntriesMock} />);

    // Primeira entrada: enabled true → false
    expect(screen.getByText(/enabled.*true/i)).toBeInTheDocument();
    expect(screen.getByText(/enabled.*false/i)).toBeInTheDocument();
  });

  it('exibe label da action em pt-BR', () => {
    render(<AuditLogViewer entries={auditEntriesMock} />);

    expect(screen.getByText(/atualiza/i)).toBeInTheDocument(); // UPDATE
    expect(screen.getByText(/adição de override/i)).toBeInTheDocument(); // OVERRIDE_ADD
  });

  it('estado vazio renderiza mensagem amigável', () => {
    render(<AuditLogViewer entries={[]} />);

    expect(screen.getByText(/nenhuma alteração registrada/i)).toBeInTheDocument();
  });
});
