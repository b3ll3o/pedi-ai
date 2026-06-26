import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSocketIO } from '@/hooks/useSocketIO';
import { getSocket } from '@/lib/socketio';

vi.mock('@/lib/socketio', () => ({
  getSocket: vi.fn(),
}));

function makeFakeSocket() {
  const listeners: Record<string, Array<(...args: unknown[]) => void>> = {};
  return {
    connected: false,
    on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
      listeners[event] = listeners[event] ?? [];
      listeners[event].push(cb);
    }),
    off: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
      const arr = listeners[event];
      if (!arr) return;
      const idx = arr.indexOf(cb);
      if (idx >= 0) arr.splice(idx, 1);
    }),
    connect: vi.fn(function (this: { connected: boolean }) {
      this.connected = true;
      // Simula o manager disparando `connect` quando conecta de fato.
      listeners.connect?.forEach((cb) => cb());
    }),
    disconnect: vi.fn(function (this: { connected: boolean }) {
      this.connected = false;
      listeners.disconnect?.forEach((cb) => cb());
    }),
    emit: vi.fn(),
    _fire: (event: string, ...args: unknown[]) => listeners[event]?.forEach((cb) => cb(...args)),
  };
}

describe('useSocketIO — S3#3: guard contra reconexão redundante', () => {
  let fakeSocket: ReturnType<typeof makeFakeSocket>;

  beforeEach(() => {
    vi.useFakeTimers();
    fakeSocket = makeFakeSocket();
    (getSocket as unknown as ReturnType<typeof vi.fn>).mockReturnValue(fakeSocket);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('NÃO chama connect() novamente se o socket já está conectado', () => {
    // Partimos do pressuposto: socket já está conectado (compartilhamento
    // de singleton entre hooks/pages). Re-render do hook não deve disparar
    // connect() novamente.
    fakeSocket.connected = true;

    renderHook(() =>
      useSocketIO({
        restaurantId: 'r1',
        enabled: true,
        autoReconnect: false,
      })
    );

    expect(fakeSocket.connect).not.toHaveBeenCalled();
  });

  it('chama connect() uma única vez na primeira montagem com socket desconectado', () => {
    renderHook(() =>
      useSocketIO({
        restaurantId: 'r1',
        enabled: true,
        autoReconnect: false,
      })
    );

    expect(fakeSocket.connect).toHaveBeenCalledTimes(1);
  });

  it('reconnect timer pula connect() se o socket reconectou antes do timeout', () => {
    renderHook(() =>
      useSocketIO({
        restaurantId: 'r1',
        enabled: true,
        autoReconnect: true,
        reconnectInterval: 1000,
        maxReconnectAttempts: 5,
      })
    );

    // Após mount, connect() foi chamado uma vez.
    expect(fakeSocket.connect).toHaveBeenCalledTimes(1);
    // Socket agora está conectado (simulado pelo fake).
    fakeSocket.connected = true;

    // Dispara `disconnect`. O hook vai armar timer de reconnect.
    act(() => {
      fakeSocket._fire('disconnect');
      fakeSocket.connected = false; // simula queda real
    });

    // Avança o relógio — connect() será chamado (socket está offline).
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    const callsAfterFirstReconnect = fakeSocket.connect.mock.calls.length;
    expect(callsAfterFirstReconnect).toBeGreaterThanOrEqual(1);

    // Simula o socket reconectando durante a janela do próximo disconnect.
    fakeSocket.connected = true;
    act(() => {
      fakeSocket._fire('disconnect');
    });

    // Avança o timer novamente — connect() NÃO deve ser chamado porque
    // socket já está connected antes do timer disparar.
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // connect foi chamado uma vez a mais no primeiro ciclo, mas no segundo
    // (com socket já conectado), NÃO incrementou.
    expect(fakeSocket.connect.mock.calls.length).toBe(callsAfterFirstReconnect);
  });
});
