import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// @ts-expect-error — módulo em implementação
import { ModalCriarFlag } from '@/components/admin/feature-flags/ModalCriarFlag';

describe('ModalCriarFlag (RF-ADM-FF-03)', () => {
  it('renderiza campos chave, descrição, tipo e valor padrão', () => {
    render(<ModalCriarFlag open onClose={vi.fn()} onSubmit={vi.fn()} role="owner" />);
    expect(screen.getByLabelText(/chave/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/descrição/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/tipo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/valor padrão/i)).toBeInTheDocument();
  });

  it('valida formato snake_case da chave (mínimo 3 caracteres)', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ModalCriarFlag open onClose={vi.fn()} onSubmit={onSubmit} role="owner" />);

    await user.type(screen.getByLabelText(/chave/i), 'ab'); // <3 chars
    await user.click(screen.getByTestId('btn-criar-flag-submit'));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByTestId('form-error')).toHaveTextContent(/3 a 64 caracteres/i);
  });

  it('muda input de valor padrão conforme tipo selecionado', async () => {
    const user = userEvent.setup();
    render(<ModalCriarFlag open onClose={vi.fn()} onSubmit={vi.fn()} role="owner" />);

    await user.click(screen.getByLabelText('Boolean'));
    expect(screen.getByLabelText(/valor padrão/i)).toBeInTheDocument();
    expect(screen.queryByTestId('input-valor-texto')).not.toBeInTheDocument();

    await user.click(screen.getByLabelText('JSON'));
    expect(screen.getByTestId('input-valor-json')).toBeInTheDocument();
  });

  it('manager NÃO vê botão "Criar" (RBAC visual)', () => {
    render(<ModalCriarFlag open onClose={vi.fn()} onSubmit={vi.fn()} role="manager" />);
    expect(screen.queryByTestId('btn-criar-flag-submit')).not.toBeInTheDocument();
    expect(screen.getByTestId('rbac-banner')).toBeInTheDocument();
  });

  it('chama onClose ao pressionar Esc', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ModalCriarFlag open onClose={onClose} onSubmit={vi.fn()} role="owner" />);
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('chama onSubmit com payload correto quando válido', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ModalCriarFlag open onClose={vi.fn()} onSubmit={onSubmit} role="owner" />);

    await user.type(screen.getByLabelText(/chave/i), 'minha_flag');
    await user.type(screen.getByLabelText(/descrição/i), 'Teste');
    // tipo padrão BOOLEAN
    await user.click(screen.getByLabelText('Boolean'));

    await user.click(screen.getByTestId('btn-criar-flag-submit'));

    expect(onSubmit).toHaveBeenCalledWith({
      key: 'minha_flag',
      description: 'Teste',
      valueType: 'BOOLEAN',
      defaultValue: false, // toggle inicia como false
    });
  });
});
