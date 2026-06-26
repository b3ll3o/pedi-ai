import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RealtimeService } from '../../../src/realtime/realtime.service';
import { RealtimeGateway } from '../../../src/realtime/realtime.gateway';

describe('RealtimeService', () => {
  let realtimeService: RealtimeService;
  let mockGateway: ReturnType<typeof createMockGateway>;

  const createMockGateway = () => ({
    emitOrderUpdate: vi.fn(),
    emitNewOrder: vi.fn(),
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockGateway = createMockGateway();
    realtimeService = new RealtimeService(mockGateway as unknown as RealtimeGateway);
  });

  // Auditoria A-R-04: realtime agora é fire-and-forget via `setImmediate` para
  // garantir que exceções do gateway não derrubem o request handler. Os testes
  // precisam aguardar o próximo tick antes de asserir.
  const flushImmediate = () => new Promise<void>((resolve) => setImmediate(resolve));

  describe('emitOrderUpdate', () => {
    it('should emit order update to restaurant room', async () => {
      const restaurantId = 'rest-1';
      const order = { id: 'order-1', status: 'preparing' };

      realtimeService.emitOrderUpdate(restaurantId, order);
      await flushImmediate();

      expect(mockGateway.emitOrderUpdate).toHaveBeenCalledWith(restaurantId, order);
      expect(mockGateway.emitOrderUpdate).toHaveBeenCalledTimes(1);
    });

    it('should emit order update with correct order ID', async () => {
      const order = { id: 'order-123', status: 'ready' };

      realtimeService.emitOrderUpdate('rest-1', order);
      await flushImmediate();

      expect(mockGateway.emitOrderUpdate).toHaveBeenCalledWith('rest-1', order);
    });

    it('should swallow gateway errors without throwing', async () => {
      // A-R-04: um cliente socket.io desconectado não pode derrubar o pod.
      mockGateway.emitOrderUpdate.mockImplementation(() => {
        throw new Error('socket disconnected');
      });

      expect(() =>
        realtimeService.emitOrderUpdate('rest-1', { id: 'x', status: 'paid' })
      ).not.toThrow();
      await flushImmediate();
      // Mock logger captura o erro; aqui só garantimos que não propagou.
      expect(mockGateway.emitOrderUpdate).toHaveBeenCalledTimes(1);
    });
  });

  describe('emitNewOrder', () => {
    it('should emit new order to restaurant room', async () => {
      const restaurantId = 'rest-1';
      const order = { id: 'order-2', total: 5990 };

      realtimeService.emitNewOrder(restaurantId, order);
      await flushImmediate();

      expect(mockGateway.emitNewOrder).toHaveBeenCalledWith(restaurantId, order);
      expect(mockGateway.emitNewOrder).toHaveBeenCalledTimes(1);
    });

    it('should emit new order with order total', async () => {
      const order = { id: 'order-new', total: 10000 };

      realtimeService.emitNewOrder('rest-2', order);
      await flushImmediate();

      expect(mockGateway.emitNewOrder).toHaveBeenCalledWith('rest-2', order);
    });
  });
});
