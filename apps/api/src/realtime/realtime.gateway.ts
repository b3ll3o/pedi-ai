import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import * as jwt from 'jsonwebtoken';
import { Server, Socket } from 'socket.io';

import { JwtPayload } from '../auth/auth.service';
import { readAccessTokenFromCookies } from '../auth/cookie-helper';

/**
 * Resolve origens CORS para o WebSocket espelhando a política REST.
 * Nunca usar `*` em produção — apenas origens explícitas.
 */
function resolveCorsOrigins(): string[] | true {
  const raw = process.env.ALLOWED_ORIGINS;
  if (!raw || raw.trim() === '') {
    if (process.env.NODE_ENV === 'production') {
      return [];
    }
    return ['http://localhost:3000'];
  }
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s !== '0.0.0.0' && s !== '*');
}

/**
 * Gateway WebSocket com **autenticação obrigatória** (auditoria C7).
 *
 * Mudanças vs. versão anterior:
 * - `OnGatewayConnection` valida JWT no handshake (cookie HttpOnly
 *   `pedi_ai_access` ou header `Authorization: Bearer ...`).
 * - Token inválido → `client.disconnect()` (rejeita imediatamente).
 * - `joinRestaurant` exige que o `restaurantId` da sala bata com o do JWT
 *   (`payload.restaurantId`). Cliente só pode entrar em seu próprio tenant.
 * - `leaveRestaurant` simétrico — sem checagem de tenant pois é só sair.
 *
 * Tokens são assinados HS256 explicitamente (mesma chave do REST). O segredo
 * vem do `JWT_SECRET` env (validado no boot pelo AuthModule).
 */
@WebSocketGateway({
  cors: {
    origin: resolveCorsOrigins(),
    credentials: true,
  },
})
@Injectable()
export class RealtimeGateway implements OnModuleInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);
  private readonly jwtSecret: string;

  @WebSocketServer()
  server: Server;

  constructor(configService: ConfigService) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    this.jwtSecret = secret;
  }

  onModuleInit() {
    this.logger.log('Realtime gateway inicializado');
  }

  /**
   * Handshake: valida JWT e armazena o payload decodificado em `socket.data.user`.
   * Sem token válido, rejeita a conexão.
   */
  handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        this.logger.warn(`Socket ${client.id} rejeitado: sem token`);
        client.disconnect(true);
        return;
      }
      const payload = jwt.verify(token, this.jwtSecret, {
        algorithms: ['HS256'],
      }) as JwtPayload;
      if (!payload?.sub) {
        this.logger.warn(`Socket ${client.id} rejeitado: payload inválido`);
        client.disconnect(true);
        return;
      }
      client.data.user = payload;
      this.logger.debug(`Socket ${client.id} autenticado (user=${payload.sub})`);
    } catch (err) {
      this.logger.warn(`Socket ${client.id} rejeitado: ${(err as Error).message}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Socket ${client.id} desconectado`);
  }

  /**
   * Cliente entra na sala do seu restaurante para receber updates.
   * Auditoria C7: `restaurantId` do body deve coincidir com o do JWT —
   * caso contrário, 403-like (retorna erro no callback).
   */
  @SubscribeMessage('joinRestaurant')
  handleJoinRestaurant(@MessageBody() restaurantId: string, @ConnectedSocket() client: Socket) {
    const user = client.data.user as JwtPayload | undefined;
    if (!user) {
      return { event: 'error', data: 'Não autenticado' };
    }
    // Staff: precisa de tenant vinculado e o ID da sala deve casar.
    if (user.restaurantId !== restaurantId) {
      return { event: 'error', data: 'Acesso negado a outro restaurante' };
    }
    client.join(`restaurant:${restaurantId}`);
    return { event: 'joined', data: `restaurant:${restaurantId}` };
  }

  @SubscribeMessage('leaveRestaurant')
  handleLeaveRestaurant(@MessageBody() restaurantId: string, @ConnectedSocket() client: Socket) {
    client.leave(`restaurant:${restaurantId}`);
    return { event: 'left', data: `restaurant:${restaurantId}` };
  }

  emitOrderUpdate(restaurantId: string, order: { id: string; status: string }) {
    this.server?.to(`restaurant:${restaurantId}`).emit('orderUpdate', order);
  }

  emitNewOrder(restaurantId: string, order: { id: string; total: number }) {
    this.server?.to(`restaurant:${restaurantId}`).emit('newOrder', order);
  }

  /**
   * Extrai token do cookie `pedi_ai_access` (primário) ou do header
   * `Authorization: Bearer ...` (fallback).
   */
  private extractToken(client: Socket): string | null {
    const fromCookie = readAccessTokenFromCookies(
      client.handshake.headers.cookie
        ? this.parseCookie(client.handshake.headers.cookie)
        : undefined
    );
    if (fromCookie) return fromCookie;
    const auth = client.handshake.headers.authorization;
    if (typeof auth === 'string' && auth.toLowerCase().startsWith('bearer ')) {
      return auth.slice(7);
    }
    return null;
  }

  private parseCookie(cookieHeader: string): Record<string, string> {
    // Auditoria ACHADO-37 (Re-varredura 7): implementação anterior usava
    // `split('=')` e `rest.join('=')` que é frágil para valores com `=` no
    // payload (ex: JWT com `==` no padding base64). Aqui usamos
    // `indexOf('=')` para localizar o primeiro separador e split em duas
    // partes — preservando valores com `=` no meio intactos.
    const out: Record<string, string> = {};
    if (!cookieHeader) return out;
    for (const part of cookieHeader.split(';')) {
      const trimmed = part.trim();
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue; // Cookie malformado (sem `=`) — ignora.
      const key = trimmed.slice(0, eqIdx).trim();
      const rawValue = trimmed.slice(eqIdx + 1).trim();
      if (!key) continue;
      try {
        out[key] = decodeURIComponent(rawValue);
      } catch {
        // Valor com encoding inválido — usa raw como fallback (não confiável,
        // mas pelo menos não lança e quebra o handshake).
        out[key] = rawValue;
      }
    }
    return out;
  }
}

// Exportado apenas para testes.
export type RealtimeGatewayPrivate = InstanceType<typeof RealtimeGateway> & {
  parseCookie(cookieHeader: string): Record<string, string>;
};
