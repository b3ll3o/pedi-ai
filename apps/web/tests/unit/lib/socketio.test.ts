import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock socket.io-client before importing
const mockSocketInstance = {
  connect: vi.fn(),
  disconnect: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  connected: true,
};

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocketInstance),
}));

describe('lib/socketio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getSocket', () => {
    it('deve criar socket com configuração correta', async () => {
      // Re-import to get fresh state
      const { getSocket } = await import('@/lib/socketio');

      const socket = getSocket();

      expect(socket).toBeDefined();
      expect(socket).toHaveProperty('connect');
      expect(socket).toHaveProperty('disconnect');
      expect(socket).toHaveProperty('on');
      expect(socket).toHaveProperty('off');
      expect(socket).toHaveProperty('emit');
    });

    it('deve chamar io com URL e opções', async () => {
      const { getSocket } = await import('@/lib/socketio');

      getSocket();

      const io = (await import('socket.io-client')).io;
      expect(io).toHaveBeenCalled();
      expect(io).toHaveBeenCalledWith(
        expect.stringContaining('localhost:3001'),
        expect.any(Object)
      );
    });
  });

  describe('disconnectSocket', () => {
    it('deve desconectar socket existente', async () => {
      const { getSocket, disconnectSocket } = await import('@/lib/socketio');

      getSocket();
      disconnectSocket();

      expect(mockSocketInstance.disconnect).toHaveBeenCalled();
    });
  });

  describe('_disconnectSocket', () => {
    it('deve chamar disconnectSocket', async () => {
      const { getSocket, _disconnectSocket } = await import('@/lib/socketio');

      getSocket();
      _disconnectSocket();

      expect(mockSocketInstance.disconnect).toHaveBeenCalled();
    });
  });

  describe('Module exports', () => {
    it('deve exportar getSocket', async () => {
      const socketModule = await import('@/lib/socketio');
      expect(typeof socketModule.getSocket).toBe('function');
    });

    it('deve exportar disconnectSocket', async () => {
      const socketModule = await import('@/lib/socketio');
      expect(typeof socketModule.disconnectSocket).toBe('function');
    });

    it('deve exportar _disconnectSocket', async () => {
      const socketModule = await import('@/lib/socketio');
      expect(typeof socketModule._disconnectSocket).toBe('function');
    });
  });
});