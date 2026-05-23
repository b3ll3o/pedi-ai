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
  const listenersRef = useRef<Map<string, Set<(...args: unknown[]) => void>>>(new Map());

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
        socketRef.current.connect();
      }, reconnectInterval);
    }
  }, [autoReconnect, maxReconnectAttempts, reconnectInterval]);

  useEffect(() => {
    const socket = socketRef.current;

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    if (enabled) {
      socket.connect();
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      clearReconnectTimer();
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
    const wrappedCallback = (...args: unknown[]) => {
      // Store callback in ref for potential cleanup
      if (!listenersRef.current.has(event)) {
        listenersRef.current.set(event, new Set());
      }
      listenersRef.current.get(event)!.add(callback);
      callback(...args);
    };

    socketRef.current.on(event, wrappedCallback);
  }, []);

  const off = useCallback((event: string, callback: (...args: unknown[]) => void) => {
    socketRef.current.off(event, callback);
    listenersRef.current.get(event)?.delete(callback);
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
