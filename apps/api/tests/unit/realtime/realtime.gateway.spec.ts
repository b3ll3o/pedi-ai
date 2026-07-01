import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConfigService } from '@nestjs/config';

import { RealtimeGateway } from '../../../src/realtime/realtime.gateway';
import { readAccessTokenFromCookies } from '../../../src/auth/cookie-helper';

/**
 * RealtimeGateway: WebSocket gateway com auth obrigatória por JWT.
 *
 * Estratégia: mockar `jsonwebtoken` via `vi.mock` no nível do módulo para
 * controlar o que `jwt.verify` retorna. Instanciar o gateway diretamente
 * (sem NestJS) com `ConfigService` stub.
 */

const verifyMock = vi.hoisted(() => vi.fn());

vi.mock('jsonwebtoken', async () => {
  const actual = await vi.importActual<typeof import('jsonwebtoken')>('jsonwebtoken');
  return {
    ...actual,
    default: { ...actual, verify: verifyMock },
    verify: verifyMock,
  };
});

/** Mock de Server com namespace `to(room).emit` chainable. */
function createMockServer() {
  const emit = vi.fn();
  const to = vi.fn().mockReturnValue({ emit });
  return { server: { to } as never, emit, to };
}

/** Mock de Socket com handshake + data + disconnect/join/leave. */
function createMockSocket(
  opts: { cookies?: string; authHeader?: string; data?: Record<string, unknown> } = {}
) {
  const disconnect = vi.fn();
  const join = vi.fn();
  const leave = vi.fn();
  const socket = {
    id: 'sock-1',
    data: opts.data ?? {},
    handshake: {
      headers: {
        ...(opts.cookies !== undefined ? { cookie: opts.cookies } : {}),
        ...(opts.authHeader !== undefined ? { authorization: opts.authHeader } : {}),
      },
    },
    disconnect,
    join,
    leave,
  };
  return { socket, disconnect, join, leave };
}

describe('RealtimeGateway', () => {
  let gateway: RealtimeGateway;
  let originalNodeEnv: string | undefined;
  let originalAllowedOrigins: string | undefined;

  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV;
    originalAllowedOrigins = process.env.ALLOWED_ORIGINS;
    process.env.NODE_ENV = 'development';
    delete process.env.ALLOWED_ORIGINS;

    const configService = {
      get: (key: string) => (key === 'JWT_SECRET' ? 'test-secret' : undefined),
    } as unknown as ConfigService;

    gateway = new RealtimeGateway(configService);
    verifyMock.mockReset();
  });

  afterEach(() => {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    if (originalAllowedOrigins === undefined) delete process.env.ALLOWED_ORIGINS;
    else process.env.ALLOWED_ORIGINS = originalAllowedOrigins;
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('lança quando JWT_SECRET ausente', () => {
      const cs = { get: () => undefined } as unknown as ConfigService;
      expect(() => new RealtimeGateway(cs)).toThrow(/JWT_SECRET/);
    });

    it('armazena secret quando presente', () => {
      expect((gateway as unknown as { jwtSecret: string }).jwtSecret).toBe('test-secret');
    });
  });

  describe('onModuleInit', () => {
    it('loga inicialização', () => {
      const logger = (gateway as unknown as { logger: { log: ReturnType<typeof vi.fn> } }).logger;
      const logSpy = vi.spyOn(logger, 'log');
      gateway.onModuleInit();
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Realtime gateway'));
    });
  });

  describe('handleConnection', () => {
    it('rejeita socket sem token (disconnect true)', () => {
      const { socket, disconnect } = createMockSocket();
      gateway.handleConnection(socket as never);
      expect(disconnect).toHaveBeenCalledWith(true);
    });

    it('autentica via header Authorization: Bearer', () => {
      const payload = { sub: 'user-1', restaurantId: 'r1' };
      verifyMock.mockReturnValue(payload);

      const { socket, disconnect } = createMockSocket({ authHeader: 'Bearer eyJhbGc.test' });
      gateway.handleConnection(socket as never);

      expect(verifyMock).toHaveBeenCalledWith('eyJhbGc.test', 'test-secret', {
        algorithms: ['HS256'],
      });
      expect(socket.data.user).toEqual(payload);
      expect(disconnect).not.toHaveBeenCalled();
    });

    it('autentica via cookie pedi_ai_access', () => {
      const payload = { sub: 'user-2', restaurantId: 'r2' };
      verifyMock.mockReturnValue(payload);

      const { socket, disconnect } = createMockSocket({
        cookies: 'pedi_ai_access=jwt-from-cookie',
      });
      gateway.handleConnection(socket as never);

      expect(socket.data.user).toEqual(payload);
      expect(disconnect).not.toHaveBeenCalled();
    });

    it('rejeita quando jwt.verify joga (token inválido)', () => {
      verifyMock.mockImplementation(() => {
        throw new Error('jwt malformed');
      });

      const { socket, disconnect } = createMockSocket({ authHeader: 'Bearer bad' });
      gateway.handleConnection(socket as never);

      expect(disconnect).toHaveBeenCalledWith(true);
    });

    it('rejeita quando payload sem sub', () => {
      verifyMock.mockReturnValue({ restaurantId: 'r1' });

      const { socket, disconnect } = createMockSocket({ authHeader: 'Bearer x.y.z' });
      gateway.handleConnection(socket as never);

      expect(disconnect).toHaveBeenCalledWith(true);
    });
  });

  describe('handleDisconnect', () => {
    it('loga debug', () => {
      const { socket } = createMockSocket();
      const logger = (gateway as unknown as { logger: { debug: ReturnType<typeof vi.fn> } }).logger;
      const debugSpy = vi.spyOn(logger, 'debug');

      gateway.handleDisconnect(socket as never);

      expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining('desconectado'));
    });
  });

  describe('handleJoinRestaurant', () => {
    it('retorna erro se socket não autenticado', () => {
      const { socket } = createMockSocket();
      const result = gateway.handleJoinRestaurant('r1', socket as never);
      expect(result).toEqual({ event: 'error', data: 'Não autenticado' });
    });

    it('retorna erro se user.restaurantId diverge', () => {
      const { socket } = createMockSocket({
        data: { user: { sub: 'u1', restaurantId: 'r1' } },
      });
      const result = gateway.handleJoinRestaurant('r2', socket as never);
      expect(result).toEqual({ event: 'error', data: 'Acesso negado a outro restaurante' });
    });

    it('join na sala correta quando tenant bate', () => {
      const { socket, join } = createMockSocket({
        data: { user: { sub: 'u1', restaurantId: 'r1' } },
      });
      const result = gateway.handleJoinRestaurant('r1', socket as never);

      expect(join).toHaveBeenCalledWith('restaurant:r1');
      expect(result).toEqual({ event: 'joined', data: 'restaurant:r1' });
    });
  });

  describe('handleLeaveRestaurant', () => {
    it('sai da sala', () => {
      const { socket, leave } = createMockSocket();
      const result = gateway.handleLeaveRestaurant('r1', socket as never);

      expect(leave).toHaveBeenCalledWith('restaurant:r1');
      expect(result).toEqual({ event: 'left', data: 'restaurant:r1' });
    });
  });

  describe('emitOrderUpdate / emitNewOrder', () => {
    it('emite orderUpdate para a sala do restaurante', () => {
      const mock = createMockServer();
      (gateway as unknown as { server: unknown }).server = mock.server;

      gateway.emitOrderUpdate('r1', { id: 'o1', status: 'paid' });

      expect(mock.to).toHaveBeenCalledWith('restaurant:r1');
      expect(mock.emit).toHaveBeenCalledWith('orderUpdate', { id: 'o1', status: 'paid' });
    });

    it('emite newOrder para a sala do restaurante', () => {
      const mock = createMockServer();
      (gateway as unknown as { server: unknown }).server = mock.server;

      gateway.emitNewOrder('r1', { id: 'o2', total: 1999 });

      expect(mock.to).toHaveBeenCalledWith('restaurant:r1');
      expect(mock.emit).toHaveBeenCalledWith('newOrder', { id: 'o2', total: 1999 });
    });

    it('emite no-op se server ausente', () => {
      (gateway as unknown as { server: undefined }).server = undefined;
      expect(() => gateway.emitOrderUpdate('r1', { id: 'o1', status: 'paid' })).not.toThrow();
    });
  });

  describe('extractToken', () => {
    it('retorna null sem cookie nem Authorization', () => {
      const { socket } = createMockSocket();
      const result = (
        gateway as unknown as {
          extractToken: (s: unknown) => string | null;
        }
      ).extractToken(socket);
      expect(result).toBeNull();
    });

    it('prioriza cookie sobre Authorization', () => {
      const { socket } = createMockSocket({
        cookies: 'pedi_ai_access=cookie-token',
        authHeader: 'Bearer header-token',
      });
      const result = (
        gateway as unknown as {
          extractToken: (s: unknown) => string | null;
        }
      ).extractToken(socket);
      expect(result).toBe('cookie-token');
    });

    it('cai em Authorization se cookie ausente', () => {
      const { socket } = createMockSocket({ authHeader: 'Bearer header-token' });
      const result = (
        gateway as unknown as {
          extractToken: (s: unknown) => string | null;
        }
      ).extractToken(socket);
      expect(result).toBe('header-token');
    });

    it('retorna null para Authorization sem prefixo Bearer', () => {
      const { socket } = createMockSocket({ authHeader: 'Basic xyz' });
      const result = (
        gateway as unknown as {
          extractToken: (s: unknown) => string | null;
        }
      ).extractToken(socket);
      expect(result).toBeNull();
    });
  });

  describe('parseCookie (privado, exposto via helper type)', () => {
    const parseCookie = (h: string): Record<string, string> =>
      (gateway as unknown as { parseCookie: (h: string) => Record<string, string> }).parseCookie(h);

    it('parse cookie simples', () => {
      expect(parseCookie('a=1; b=2')).toEqual({ a: '1', b: '2' });
    });

    it('preserva valor com `=` (JWT base64)', () => {
      const jwtLike = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.abc==';
      expect(parseCookie(`pedi_ai_access=${jwtLike}`)).toEqual({
        pedi_ai_access: jwtLike,
      });
    });

    it('ignora cookie malformado sem `=`', () => {
      expect(parseCookie('valid=1; orphan; another=2')).toEqual({ valid: '1', another: '2' });
    });

    it('ignora cookie com chave vazia', () => {
      expect(parseCookie('=value; a=1')).toEqual({ a: '1' });
    });

    it('decodifica valores URL-encoded', () => {
      expect(parseCookie('a=hello%20world')).toEqual({ a: 'hello world' });
    });

    it('cai em raw value quando decode falha', () => {
      const result = parseCookie('a=%ZZ');
      expect(result).toEqual({ a: '%ZZ' });
    });

    it('retorna {} para header vazio', () => {
      expect(parseCookie('')).toEqual({});
    });
  });
});

/**
 * readAccessTokenFromCookies — função pública de `cookie-helper` chamada
 * pelo gateway. Garante integração do contrato entre os dois.
 */
describe('readAccessTokenFromCookies integração', () => {
  it('retorna token quando cookie pedi_ai_access existe', () => {
    const result = readAccessTokenFromCookies({ pedi_ai_access: 'jwt-cookie-token' });
    expect(result).toBe('jwt-cookie-token');
  });

  it('retorna null/undefined quando cookie ausente', () => {
    expect(readAccessTokenFromCookies({})).toBeFalsy();
    expect(readAccessTokenFromCookies(undefined)).toBeFalsy();
  });
});
