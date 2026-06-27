import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ToastProvider, useToast } from '@/lib/notification';

describe('useToast', () => {
  it('lança erro se usado fora do ToastProvider', () => {
    expect(() => renderHook(() => useToast())).toThrow(/ToastProvider/);
  });

  it('adiciona toast de sucesso', () => {
    const { result } = renderHook(() => useToast(), { wrapper: ToastProvider });
    act(() => result.current.success('Operação concluída'));
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0]).toMatchObject({
      severity: 'success',
      message: 'Operação concluída',
    });
  });

  it('expõe helpers por severidade (success/error/info/warning)', () => {
    const { result } = renderHook(() => useToast(), { wrapper: ToastProvider });
    act(() => {
      result.current.success('ok');
      result.current.error('falhou');
      result.current.info('info');
      result.current.warning('aviso');
    });
    expect(result.current.toasts.map((t) => t.severity)).toEqual([
      'success',
      'error',
      'info',
      'warning',
    ]);
  });

  it('remove toast por id via dismiss()', () => {
    const { result } = renderHook(() => useToast(), { wrapper: ToastProvider });
    let id = '';
    act(() => {
      id = result.current.success('msg');
    });
    expect(result.current.toasts).toHaveLength(1);
    act(() => result.current.dismiss(id));
    expect(result.current.toasts).toHaveLength(0);
  });

  it('atribui id único a cada toast', () => {
    const { result } = renderHook(() => useToast(), { wrapper: ToastProvider });
    act(() => {
      result.current.success('a');
      result.current.success('b');
    });
    expect(result.current.toasts[0].id).not.toBe(result.current.toasts[1].id);
  });
});
