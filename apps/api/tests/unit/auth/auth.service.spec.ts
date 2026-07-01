import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { AuthService } from '../../../src/auth/auth.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../../src/common/prisma.service';
import { RefreshTokenService } from '../../../src/auth/refresh-token.service';
import { EmailQueue } from '../../../src/queues/email.queue';

vi.mock('bcrypt', () => ({
  hash: vi.fn().mockResolvedValue('hashed-password'),
  compare: vi.fn().mockResolvedValue(true),
}));

// Mock global.fetch para HIBP — não fazer chamadas reais durante testes.
const mockFetch = vi.fn().mockResolvedValue({
  ok: true,
  text: () => Promise.resolve(''),
});
vi.stubGlobal('fetch', mockFetch);

describe('AuthService', () => {
  let authService: AuthService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let mockJwt: ReturnType<typeof createMockJwt>;
  let mockRefreshTokenService: ReturnType<typeof createMockRefreshTokenService>;
  let mockEmailQueue: { sendPasswordReset: ReturnType<typeof vi.fn> };

  const createMockPrisma = () => ({
    usersProfile: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    refreshToken: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    passwordResetToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      // Auditoria A-04: claim atômico via updateMany (count === 1).
      findFirst: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    $transaction: vi.fn(),
  });

  const createMockJwt = () => ({
    sign: vi.fn().mockReturnValue('mock-token'),
    verify: vi.fn(),
  });

  const createMockRefreshTokenService = () => ({
    issue: vi.fn().mockResolvedValue({
      token: 'mock-refresh-token',
      tokenId: 'mock-token-id',
      familyId: 'mock-family-id',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    }),
    validateAndRotate: vi.fn().mockResolvedValue({
      userId: 'user-1',
      familyId: 'mock-family-id',
      tokenId: 'mock-token-id',
    }),
    revoke: vi.fn().mockResolvedValue(undefined),
    revokeAllForUser: vi.fn().mockResolvedValue(0),
    revokeFamily: vi.fn().mockResolvedValue(undefined),
  });

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    process.env.JWT_SECRET = 'test-secret';
    mockPrisma = createMockPrisma();
    mockJwt = createMockJwt();
    mockRefreshTokenService = createMockRefreshTokenService();
    mockEmailQueue = { sendPasswordReset: vi.fn().mockResolvedValue(undefined) };

    authService = new AuthService(
      mockPrisma as unknown as PrismaService,
      mockJwt as unknown as JwtService,
      mockRefreshTokenService as unknown as RefreshTokenService,
      mockEmailQueue as unknown as EmailQueue
    );
  });

  afterEach(() => {
    delete process.env.JWT_REFRESH_SECRET;
    delete process.env.JWT_SECRET;
    delete process.env.APP_PUBLIC_URL;
  });

  const validPassword = 'Password@123';
  const registerData = {
    email: 'test@example.com',
    password: validPassword,
    name: 'Test User',
  };

  describe('register', () => {
    it('registra novo usuário com sucesso', async () => {
      mockPrisma.usersProfile.findUnique.mockResolvedValue(null);
      mockPrisma.usersProfile.create.mockResolvedValue({
        id: 'user-1',
        email: registerData.email,
        name: registerData.name,
        passwordHash: 'hashed-password',
        role: 'cliente',
      });

      const result = await authService.register(registerData);

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
      expect(result.user.email).toBe(registerData.email);
    });

    it('lança ConflictException quando email já existe', async () => {
      mockPrisma.usersProfile.findUnique.mockResolvedValue({
        id: 'existing-user',
        email: registerData.email,
      });

      await expect(authService.register(registerData)).rejects.toThrow(ConflictException);
    });

    it('lança BadRequestException para senha curta', async () => {
      await expect(authService.register({ ...registerData, password: 'short' })).rejects.toThrow(
        /no mínimo/
      );
    });

    it('lança BadRequestException para senha sem complexidade', async () => {
      await expect(
        authService.register({ ...registerData, password: 'longpasswordwithoutcomplex' })
      ).rejects.toThrow(/maiúscula/);
    });
  });

  describe('login', () => {
    const loginData = { email: 'test@example.com', password: validPassword };

    it('login com credenciais válidas', async () => {
      mockPrisma.usersProfile.findUnique.mockResolvedValue({
        id: 'user-1',
        email: loginData.email,
        name: 'Test User',
        passwordHash: 'hashed-password',
        role: 'cliente',
        restaurantId: null,
      });

      const result = await authService.login(loginData);
      expect(result.access_token).toBeDefined();
    });

    it('lança UnauthorizedException quando user não encontrado', async () => {
      mockPrisma.usersProfile.findUnique.mockResolvedValue(null);
      await expect(authService.login(loginData)).rejects.toThrow(UnauthorizedException);
    });

    it('lança UnauthorizedException quando senha inválida', async () => {
      mockPrisma.usersProfile.findUnique.mockResolvedValue({
        id: 'user-1',
        email: loginData.email,
        name: 'Test User',
        passwordHash: 'hashed-password',
        role: 'cliente',
      });
      const bcrypt = await import('bcrypt');
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      await expect(authService.login(loginData)).rejects.toThrow(UnauthorizedException);
    });

    it('lança UnauthorizedException quando passwordHash é null', async () => {
      mockPrisma.usersProfile.findUnique.mockResolvedValue({
        id: 'user-1',
        email: loginData.email,
        passwordHash: null,
        role: 'cliente',
      });

      await expect(authService.login(loginData)).rejects.toThrow(UnauthorizedException);
    });

    it('inclui restaurantId no payload se existir', async () => {
      mockPrisma.usersProfile.findUnique.mockResolvedValue({
        id: 'user-1',
        email: loginData.email,
        name: 'Test',
        passwordHash: 'hashed-password',
        role: 'dono',
        restaurantId: 'rest-1',
      });
      const bcrypt = await import('bcrypt');
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

      await authService.login(loginData);

      const signCall = mockJwt.sign.mock.calls[0];
      expect(signCall[0]).toMatchObject({ restaurantId: 'rest-1' });
    });
  });

  describe('refresh', () => {
    it('troca refresh por novo par (camel + snake)', async () => {
      const user = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'cliente',
        restaurantId: null,
      };
      mockPrisma.usersProfile.findUnique.mockResolvedValue(user);

      const result = await authService.refresh('valid-token');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
    });

    it('lança UnauthorizedException quando validateAndRotate joga', async () => {
      mockRefreshTokenService.validateAndRotate.mockRejectedValueOnce(
        new UnauthorizedException('Refresh token inválido')
      );

      await expect(authService.refresh('invalid')).rejects.toThrow(UnauthorizedException);
    });

    it('lança UnauthorizedException quando user não existe (deletado entre tokens)', async () => {
      mockPrisma.usersProfile.findUnique.mockResolvedValue(null);

      await expect(authService.refresh('valid')).rejects.toThrow(/não encontrado/);
    });
  });

  describe('logout', () => {
    const requesterUserId = 'user-1';

    it('revoga todos tokens do user', async () => {
      mockRefreshTokenService.validateAndRotate.mockResolvedValue({
        userId: requesterUserId,
        familyId: 'fam',
        tokenId: 'tok',
      });

      const result = await authService.logout('valid-token', requesterUserId);

      expect(result).toEqual({ success: true });
      expect(mockRefreshTokenService.revokeAllForUser).toHaveBeenCalledWith(
        requesterUserId,
        'user_logout'
      );
    });

    it('lança ForbiddenException quando token apresentado é de outro user (audit M-N5)', async () => {
      mockRefreshTokenService.validateAndRotate.mockResolvedValue({
        userId: 'OTHER-user',
        familyId: 'fam',
        tokenId: 'tok',
      });

      await expect(authService.logout('victim-token', requesterUserId)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('idempotente quando refreshToken é undefined', async () => {
      const result = await authService.logout(undefined, requesterUserId);
      expect(result).toEqual({ success: true });
      expect(mockRefreshTokenService.validateAndRotate).not.toHaveBeenCalled();
    });

    it('idempotente quando validateAndRotate joga (token inválido)', async () => {
      mockRefreshTokenService.validateAndRotate.mockRejectedValueOnce(
        new UnauthorizedException('Token inválido')
      );

      // Não propaga erro — logout é idempotente.
      const result = await authService.logout('invalid-token', requesterUserId);
      expect(result).toEqual({ success: true });
    });
  });

  describe('validateUser', () => {
    it('retorna user normalizado se encontrado', async () => {
      mockPrisma.usersProfile.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'cliente',
        restaurantId: null,
      });

      const result = await authService.validateUser({
        sub: 'user-1',
        email: 'test@example.com',
        role: 'cliente',
      });

      expect(result).toMatchObject({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'cliente',
        restaurantId: null,
      });
    });

    it('retorna null quando user não encontrado', async () => {
      mockPrisma.usersProfile.findUnique.mockResolvedValue(null);
      const result = await authService.validateUser({
        sub: 'user-1',
        email: 'x',
        role: 'cliente',
      });
      expect(result).toBeNull();
    });

    it('preserva restaurantId no resultado', async () => {
      mockPrisma.usersProfile.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test',
        role: 'dono',
        restaurantId: 'rest-1',
      });

      const result = await authService.validateUser({
        sub: 'user-1',
        email: 'test@example.com',
        role: 'dono',
      });

      expect(result?.restaurantId).toBe('rest-1');
    });
  });

  describe('requestPasswordReset', () => {
    it('retorna mensagem genérica quando user não existe (anti-enumeração)', async () => {
      mockPrisma.usersProfile.findUnique.mockResolvedValue(null);

      const result = await authService.requestPasswordReset('unknown@example.com');

      expect(result.message).toMatch(/Se o email/);
      expect(mockEmailQueue.sendPasswordReset).not.toHaveBeenCalled();
      expect(mockPrisma.passwordResetToken.create).not.toHaveBeenCalled();
    });

    it('gera token + enfileira email quando user existe', async () => {
      mockPrisma.usersProfile.findUnique.mockResolvedValue({ id: 'user-1' });
      mockPrisma.passwordResetToken.create.mockResolvedValue({});

      await authService.requestPasswordReset('test@example.com');

      expect(mockPrisma.passwordResetToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            token: expect.stringMatching(/^[a-f0-9]{64}$/),
            expiresAt: expect.any(Date),
          }),
        })
      );
      expect(mockEmailQueue.sendPasswordReset).toHaveBeenCalledWith(
        'test@example.com',
        expect.stringMatching(/#token=/)
      );
    });

    it('usa APP_PUBLIC_URL para construir link de reset', async () => {
      process.env.APP_PUBLIC_URL = 'https://app.pedi-ai.com';
      mockPrisma.usersProfile.findUnique.mockResolvedValue({ id: 'user-1' });
      mockPrisma.passwordResetToken.create.mockResolvedValue({});

      await authService.requestPasswordReset('test@example.com');

      expect(mockEmailQueue.sendPasswordReset).toHaveBeenCalledWith(
        'test@example.com',
        expect.stringMatching(/^https:\/\/app\.pedi-ai\.com\//)
      );
    });

    it('cai em localhost:3000 quando APP_PUBLIC_URL não definido', async () => {
      mockPrisma.usersProfile.findUnique.mockResolvedValue({ id: 'user-1' });
      mockPrisma.passwordResetToken.create.mockResolvedValue({});

      await authService.requestPasswordReset('test@example.com');

      expect(mockEmailQueue.sendPasswordReset).toHaveBeenCalledWith(
        'test@example.com',
        expect.stringMatching(/localhost:3000/)
      );
    });
  });

  describe('resetPassword', () => {
    it('lança BadRequest para senha fraca', async () => {
      await expect(authService.resetPassword({ token: 't', newPassword: 'short' })).rejects.toThrow(
        /no mínimo/
      );
    });

    it('lança BadRequest quando count=0 (token inválido/expirado/usado)', async () => {
      mockPrisma.passwordResetToken.updateMany.mockResolvedValueOnce({ count: 0 });

      await expect(
        authService.resetPassword({ token: 'bad', newPassword: validPassword })
      ).rejects.toThrow(/inválido/);
    });

    it('atualiza senha + invalida refresh tokens via $transaction', async () => {
      mockPrisma.passwordResetToken.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.passwordResetToken.findFirst.mockResolvedValue({ userId: 'user-1' });
      mockPrisma.$transaction.mockResolvedValue([]);

      await authService.resetPassword({ token: 'valid', newPassword: validPassword });

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      const txOps = mockPrisma.$transaction.mock.calls[0][0] as unknown[];
      expect(Array.isArray(txOps)).toBe(true);
      expect(txOps.length).toBeGreaterThanOrEqual(2);
    });

    it('lança BadRequest quando findFirst não retorna (raro mas possível)', async () => {
      mockPrisma.passwordResetToken.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.passwordResetToken.findFirst.mockResolvedValue(null);

      await expect(
        authService.resetPassword({ token: 'valid', newPassword: validPassword })
      ).rejects.toThrow(/inválido/);
    });
  });
});
