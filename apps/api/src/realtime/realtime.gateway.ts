import { Injectable, OnModuleInit } from '@nestjs/common';
import { Server } from 'socket.io';
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
@Injectable()
export class RealtimeGateway implements OnModuleInit {
  @WebSocketServer()
  server: Server;

  onModuleInit() {
    // Server instance is now available via this.server
  }

  @SubscribeMessage('joinRestaurant')
  handleJoinRestaurant(
    @MessageBody() restaurantId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`restaurant:${restaurantId}`);
    return { event: 'joined', data: `restaurant:${restaurantId}` };
  }

  @SubscribeMessage('leaveRestaurant')
  handleLeaveRestaurant(
    @MessageBody() restaurantId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`restaurant:${restaurantId}`);
    return { event: 'left', data: `restaurant:${restaurantId}` };
  }

  emitOrderUpdate(restaurantId: string, order: { id: string; status: string }) {
    this.server?.to(`restaurant:${restaurantId}`).emit('orderUpdate', order);
  }

  emitNewOrder(restaurantId: string, order: { id: string; total: number }) {
    this.server?.to(`restaurant:${restaurantId}`).emit('newOrder', order);
  }
}
