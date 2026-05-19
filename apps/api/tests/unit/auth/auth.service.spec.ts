import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { AuthService } from '../../../src/auth/auth.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../../src/common/prisma.service';

vi.mock('bcrypt', () => ({
  hash: vi.fn().mockResolvedValue('hashed-password'),
  compare: vi.fn().mockResolvedValue(true),
}));

describe('AuthService', () => {
  let authService: AuthService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let mockJwt: ReturnType<typeof createMockJwt>;

  const createMockPrisma = () => ({
    usersProfile: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  });

  const createMockJwt = () => ({
    sign: vi.fn().mockReturnValue('mock-token'),
    verify: vi.fn(),
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    mockJwt = createMockJwt();
    authService = new AuthService(mockPrisma as unknown as PrismaService, mockJwt as unknown as JwtService);
  });

  describe('register', () => {
    const registerData = {
      email: 'test@example.com',
      password: 'password123',
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
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      const refreshToken = 'valid-refresh-token';
      mockJwt.verify.mockReturnValue({ sub: 'user-1', email: 'test@example.com', role: 'cliente' });
      mockPrisma.usersProfile.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'cliente',
      });

      const result = await authService.refreshToken(refreshToken);

      expect(result).toHaveProperty('access_token');
      expect(mockJwt.sign).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if token is invalid', async () => {
      mockJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(authService.refreshToken('invalid-token')).rejects.toThrow(UnauthorizedException);
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

      expect(result).toEqual({
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