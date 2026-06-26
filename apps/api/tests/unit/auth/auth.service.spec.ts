import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { AuthService } from '../../../src/auth/auth.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../../src/common/prisma.service';
import { RefreshTokenService } from '../../../src/auth/refresh-token.service';

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

  const createMockPrisma = () => ({
    usersProfile: {
      findUnique: vi.fn(),
      create: vi.fn(),
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
      // Auditoria A-04: claim atômico do token via updateMany (count === 1).
      findFirst: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
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
      presented: { id: 'mock-token-id', familyId: 'mock-family-id' },
    }),
    revoke: vi.fn().mockResolvedValue(undefined),
    revokeAllForUser: vi.fn().mockResolvedValue(undefined),
    revokeFamily: vi.fn().mockResolvedValue(undefined),
  });

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    process.env.JWT_SECRET = 'test-secret';
    mockPrisma = createMockPrisma();
    mockJwt = createMockJwt();
    mockRefreshTokenService = createMockRefreshTokenService();
    authService = new AuthService(
      mockPrisma as unknown as PrismaService,
      mockJwt as unknown as JwtService,
      mockRefreshTokenService as unknown as RefreshTokenService
    );
  });

  afterEach(() => {
    delete process.env.JWT_REFRESH_SECRET;
    delete process.env.JWT_SECRET;
  });

  describe('register', () => {
    const registerData = {
      email: 'test@example.com',
      password: 'Password@123',
      name: 'Test User',
    };

    it('should register a new user successfully', async () => {
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
      expect(mockPrisma.usersProfile.findUnique).toHaveBeenCalledWith({
        where: { email: registerData.email },
      });
    });

    it('should throw ConflictException if email already exists', async () => {
      mockPrisma.usersProfile.findUnique.mockResolvedValue({
        id: 'existing-user',
        email: registerData.email,
      });

      await expect(authService.register(registerData)).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    const loginData = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should login successfully with valid credentials', async () => {
      mockPrisma.usersProfile.findUnique.mockResolvedValue({
        id: 'user-1',
        email: loginData.email,
        name: 'Test User',
        passwordHash: 'hashed-password',
        role: 'cliente',
      });

      const result = await authService.login(loginData);

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
      expect(result.user.email).toBe(loginData.email);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockPrisma.usersProfile.findUnique.mockResolvedValue(null);

      await expect(authService.login(loginData)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
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

    it('should throw UnauthorizedException if passwordHash is null', async () => {
      mockPrisma.usersProfile.findUnique.mockResolvedValue({
        id: 'user-1',
        email: loginData.email,
        name: 'Test User',
        passwordHash: null,
        role: 'cliente',
      });

      await expect(authService.login(loginData)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('should refresh token successfully', async () => {
      const refreshToken = 'valid-refresh-token';
      mockPrisma.usersProfile.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'cliente',
      });
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'mock-token-id',
        familyId: 'mock-family-id',
      });

      const result = await authService.refresh(refreshToken);

      expect(result).toHaveProperty('access_token');
      expect(mockJwt.sign).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if token is invalid', async () => {
      mockRefreshTokenService.validateAndRotate.mockRejectedValueOnce(
        new UnauthorizedException('Refresh token inválido')
      );

      await expect(authService.refresh('invalid-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('validateUser', () => {
    it('should return user if found', async () => {
      mockPrisma.usersProfile.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'cliente',
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
      });
    });

    it('should return null if user not found', async () => {
      mockPrisma.usersProfile.findUnique.mockResolvedValue(null);

      const result = await authService.validateUser({
        sub: 'user-1',
        email: 'test@example.com',
        role: 'cliente',
      });

      expect(result).toBeNull();
    });
  });
});
