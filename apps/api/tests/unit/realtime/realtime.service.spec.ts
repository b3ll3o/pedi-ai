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

  describe('emitOrderUpdate', () => {
    it('should emit order update to restaurant room', () => {
      const restaurantId = 'rest-1';
      const order = { id: 'order-1', status: 'preparing' };

      realtimeService.emitOrderUpdate(restaurantId, order);

      expect(mockGateway.emitOrderUpdate).toHaveBeenCalledWith(restaurantId, order);
      expect(mockGateway.emitOrderUpdate).toHaveBeenCalledTimes(1);
    });

    it('should emit order update with correct order ID', () => {
      const order = { id: 'order-123', status: 'ready' };

      realtimeService.emitOrderUpdate('rest-1', order);

      expect(mockGateway.emitOrderUpdate).toHaveBeenCalledWith('rest-1', order);
    });
  });

  describe('emitNewOrder', () => {
    it('should emit new order to restaurant room', () => {
      const restaurantId = 'rest-1';
      const order = { id: 'order-2', total: 5990 };

      realtimeService.emitNewOrder(restaurantId, order);

      expect(mockGateway.emitNewOrder).toHaveBeenCalledWith(restaurantId, order);
      expect(mockGateway.emitNewOrder).toHaveBeenCalledTimes(1);
    });

    it('should emit new order with order total', () => {
      const order = { id: 'order-new', total: 10000 };

      realtimeService.emitNewOrder('rest-2', order);

      expect(mockGateway.emitNewOrder).toHaveBeenCalledWith('rest-2', order);
    });
  });
});
