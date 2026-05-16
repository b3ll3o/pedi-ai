import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class RealtimeGateway {
  @WebSocketServer()
  server: Server;

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

  // Método para emitir atualização de pedido para toda a restaurante
  emitOrderUpdate(restaurantId: string, order: { id: string; status: string }) {
    this.server.to(`restaurant:${restaurantId}`).emit('orderUpdate', order);
  }

  // Método para emitir novo pedido
  emitNewOrder(restaurantId: string, order: { id: string; total: number }) {
    this.server.to(`restaurant:${restaurantId}`).emit('newOrder', order);
  }
}
