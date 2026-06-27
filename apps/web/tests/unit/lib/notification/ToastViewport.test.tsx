import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ToastProvider, useToast } from '@/lib/notification';

describe('ToastViewport (a11y + render)', () => {
  function Trigger({
    msg,
    severity = 'success' as const,
  }: {
    msg: string;
    severity?: 'success' | 'error' | 'info' | 'warning';
  }) {
    const toast = useToast();
    return <button onClick={() => toast[severity](msg)}>emitir</button>;
  }

  it('renderiza viewport oculta quando não há toasts', () => {
    render(
      <ToastProvider>
        <span>conteúdo</span>
      </ToastProvider>
    );
    const viewport = screen.getByTestId('toast-viewport');
    expect(viewport.children.length).toBe(0);
  });

  it('renderiza cada toast com testid por severidade', async () => {
    render(
      <ToastProvider>
        <Trigger msg="salvo" />
        <Trigger msg="erro" severity="error" />
      </ToastProvider>
    );
    act(() => screen.getAllByRole('button')[0].click());
    act(() => screen.getAllByRole('button')[1].click());
    expect(screen.getByTestId('toast-success')).toHaveTextContent('salvo');
    expect(screen.getByTestId('toast-error')).toHaveTextContent('erro');
  });

  it('toast de sucesso usa role=status (polite), erro usa role=alert (assertive)', () => {
    render(
      <ToastProvider>
        <Trigger msg="ok" />
        <Trigger msg="falha" severity="error" />
      </ToastProvider>
    );
    act(() => screen.getAllByRole('button')[0].click());
    act(() => screen.getAllByRole('button')[1].click());
    expect(screen.getByTestId('toast-success')).toHaveAttribute('role', 'status');
    expect(screen.getByTestId('toast-error')).toHaveAttribute('role', 'alert');
  });

  it('botão × chama onDismiss', () => {
    render(
      <ToastProvider>
        <Trigger msg="x" />
      </ToastProvider>
    );
    act(() => screen.getByRole('button', { name: /emitir/ }).click());
    const closeBtn = screen.getByRole('button', { name: /fechar notificação/i });
    act(() => closeBtn.click());
    expect(screen.queryByTestId('toast-success')).not.toBeInTheDocument();
  });
});
