import { act, renderHook } from '@testing-library/react';
import { useRef } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useFocusTrap } from '@/lib/a11y/use-focus-trap';

describe('useFocusTrap', () => {
  it('não faz nada quando active=false', () => {
    const container = document.createElement('div');
    container.innerHTML = '<button>ok</button>';
    document.body.appendChild(container);

    const onEscape = vi.fn();
    const { result } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(null);
      ref.current = container;
      useFocusTrap(ref, false, onEscape);
      return ref;
    });

    container.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(onEscape).not.toHaveBeenCalled();
    expect(document.activeElement).not.toBe(container.querySelector('button'));

    document.body.removeChild(container);
    // result is for type-narrowing only
    void result;
  });

  it('foca o primeiro elemento focável quando active=true', () => {
    const container = document.createElement('div');
    container.innerHTML = '<button id="b1">b1</button><button id="b2">b2</button>';
    document.body.appendChild(container);

    renderHook(() => {
      const ref = useRef<HTMLDivElement>(null);
      ref.current = container;
      useFocusTrap(ref, true);
      return ref;
    });

    expect(document.activeElement).toBe(container.querySelector('#b1'));
    document.body.removeChild(container);
  });

  it('Tab a partir do último volta ao primeiro', () => {
    const container = document.createElement('div');
    container.innerHTML = '<button id="b1">b1</button><button id="b2">b2</button>';
    document.body.appendChild(container);

    renderHook(() => {
      const ref = useRef<HTMLDivElement>(null);
      ref.current = container;
      useFocusTrap(ref, true);
      return ref;
    });

    const b2 = container.querySelector<HTMLButtonElement>('#b2')!;
    b2.focus();

    act(() => {
      container.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    });

    expect(document.activeElement).toBe(container.querySelector('#b1'));
    document.body.removeChild(container);
  });

  it('Shift+Tab a partir do primeiro vai para o último', () => {
    const container = document.createElement('div');
    container.innerHTML = '<button id="b1">b1</button><button id="b2">b2</button>';
    document.body.appendChild(container);

    renderHook(() => {
      const ref = useRef<HTMLDivElement>(null);
      ref.current = container;
      useFocusTrap(ref, true);
      return ref;
    });

    const b1 = container.querySelector<HTMLButtonElement>('#b1')!;
    b1.focus();

    act(() => {
      container.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true })
      );
    });

    expect(document.activeElement).toBe(container.querySelector('#b2'));
    document.body.removeChild(container);
  });

  it('Esc chama onEscape callback', () => {
    const container = document.createElement('div');
    container.innerHTML = '<button>ok</button>';
    document.body.appendChild(container);

    const onEscape = vi.fn();
    renderHook(() => {
      const ref = useRef<HTMLDivElement>(null);
      ref.current = container;
      useFocusTrap(ref, true, onEscape);
      return ref;
    });

    act(() => {
      container.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });

    expect(onEscape).toHaveBeenCalledTimes(1);
    document.body.removeChild(container);
  });
});
