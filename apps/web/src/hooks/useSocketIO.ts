/**
 * useSocketIO Hook
 * Abstract connection hook for Socket.io with reconnection and room management.
 */

import { useEffect, useCallback, useState, useRef } from 'react';

import { getSocket } from '@/lib/socketio';

export interface UseSocketIOOptions {
  restaurantId?: string;
  enabled?: boolean;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export interface UseSocketIOResult {
  isConnected: boolean;
  isReconnecting: boolean;
  joinRestaurant: (id: string) => void;
  leaveRestaurant: (id: string) => void;
  on: (event: string, callback: (...args: unknown[]) => void) => void;
  off: (event: string, callback: (...args: unknown[]) => void) => void;
  disconnect: () => void;
}

export function useSocketIO({
  restaurantId,
  enabled = true,
  autoReconnect = true,
  reconnectInterval = 5000,
  maxReconnectAttempts = 5,
}: UseSocketIOOptions = {}): UseSocketIOResult {
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const socketRef = useRef(getSocket());
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const listenersRef = useRef<
    Map<string, Map<(...args: unknown[]) => void, (...args: unknown[]) => void>>
  >(new Map());

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const handleConnect = useCallback(() => {
    setIsConnected(true);
    setIsReconnecting(false);
    reconnectAttemptsRef.current = 0;
    clearReconnectTimer();

    // Re-join restaurant room if we had one
    if (restaurantId) {
      socketRef.current.emit('joinRestaurant', restaurantId);
    }
  }, [restaurantId, clearReconnectTimer]);

  const handleDisconnect = useCallback(() => {
    setIsConnected(false);

    // Auto reconnect logic
    if (autoReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
      setIsReconnecting(true);
      reconnectAttemptsRef.current += 1;
      reconnectTimerRef.current = setTimeout(() => {
        // S3#3: guarda contra reconexão redundante. Se o socket já estiver
        // conectado (browser recuperou rede durante o `reconnectInterval`),
        // pular `connect()` evita reset do manager interno + re-emissão
        // de `joinRestaurant` em todas as abas que compartilham o singleton.
        if (!socketRef.current.connected) {
          socketRef.current.connect();
        }
      }, reconnectInterval);
    }
  }, [autoReconnect, maxReconnectAttempts, reconnectInterval]);

  useEffect(() => {
    const socket = socketRef.current;

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    // S3#3: o effect re-roda sempre que `enabled` ou qualquer callback
    // muda — `handleConnect`/`handleDisconnect` são recriados a cada
    // render porque fecham sobre `restaurantId`/`reconnectInterval`.
    // Sem o guarda `!socket.connected`, cada re-render dispara um
    // `connect()` mesmo com socket já ativo, causando reconnect-storm
    // visível no admin (joinRestaurant emitido N vezes).
    if (enabled && !socket.connected) {
      socket.connect();
    }

    // Captura local: ref objects são estáveis, mas `listenersRef.current`
    // pode mudar entre effect e cleanup (React 18 strict mode, fast refresh).
    // Copiamos a referência para garantir cleanup correto.
    const listenersSnapshot = listenersRef.current;

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      clearReconnectTimer();

      // Defesa em profundidade: se o consumidor esqueceu de chamar `off`
      // no cleanup do seu useEffect, ainda assim removemos tudo o que foi
      // registrado por ESTE hook. Crítico para o singleton do socket não
      // vazar handlers entre navegações de página.
      listenersSnapshot.forEach((wrappedMap, event) => {
        wrappedMap.forEach((wrapped) => socket.off(event, wrapped));
      });
      listenersSnapshot.clear();
    };
  }, [enabled, handleConnect, handleDisconnect, clearReconnectTimer]);

  // Join restaurant room when restaurantId changes
  useEffect(() => {
    if (isConnected && restaurantId) {
      socketRef.current.emit('joinRestaurant', restaurantId);
    }
  }, [isConnected, restaurantId]);

  const joinRestaurant = useCallback(
    (id: string) => {
      if (isConnected) {
        socketRef.current.emit('joinRestaurant', id);
      }
    },
    [isConnected]
  );

  const leaveRestaurant = useCallback(
    (id: string) => {
      if (isConnected) {
        socketRef.current.emit('leaveRestaurant', id);
      }
    },
    [isConnected]
  );

  const on = useCallback((event: string, callback: (...args: unknown[]) => void) => {
    // O socket exige que `off` receba a MESMA referência registrada via `on`.
    // Como queremos expor ao consumidor apenas `callback`, embrulhamos em
    // `wrappedCallback` e armazenamos o wrapped para que `off` consiga
    // removê-lo. Sem isso, `off` nunca casa e listeners acumulam no
    // singleton do socket (KDS em uso contínuo → OOM em horas).
    const wrappedCallback = (...args: unknown[]) => callback(...args);

    const wrappedMap = listenersRef.current.get(event) ?? new Map();
    // Se o consumidor registrou o mesmo `callback` duas vezes, mantemos
    // apenas o wrapper mais recente para evitar duplicação.
    wrappedMap.set(callback, wrappedCallback);
    listenersRef.current.set(event, wrappedMap);

    socketRef.current.on(event, wrappedCallback);
  }, []);

  const off = useCallback((event: string, callback: (...args: unknown[]) => void) => {
    const wrappedMap = listenersRef.current.get(event);
    const wrapped = wrappedMap?.get(callback);
    if (wrapped) {
      socketRef.current.off(event, wrapped);
      wrappedMap!.delete(callback);
      if (wrappedMap!.size === 0) {
        listenersRef.current.delete(event);
      }
    }
  }, []);

  const disconnect = useCallback(() => {
    clearReconnectTimer();
    socketRef.current.disconnect();
    setIsConnected(false);
    setIsReconnecting(false);
  }, [clearReconnectTimer]);

  return {
    isConnected,
    isReconnecting,
    joinRestaurant,
    leaveRestaurant,
    on,
    off,
    disconnect,
  };
}

// Separate hook to get socket instance directly
export function useSocket() {
  return getSocket();
}
