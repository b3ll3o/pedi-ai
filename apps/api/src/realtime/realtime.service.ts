import { Injectable } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';

@Injectable()
export class RealtimeService {
  constructor(private readonly gateway: RealtimeGateway) {}

  emitOrderUpdate(restaurantId: string, order: { id: string; status: string }) {
    this.gateway.emitOrderUpdate(restaurantId, order);
  }

  emitNewOrder(restaurantId: string, order: { id: string; total: number }) {
    this.gateway.emitNewOrder(restaurantId, order);
  }
}