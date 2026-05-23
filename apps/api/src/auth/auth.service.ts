import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../common/prisma.service';

// ─── Requisitos de senha forte ────────────────────────────────────────────────
const SENHA_MIN_CARACTERES = 8;
const SENHA_REGEX_FORCA = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

function validarForcaSenha(senha: string): void {
  if (senha.length < SENHA_MIN_CARACTERES) {
    throw new BadRequestException(
      `Senha deve ter no mínimo ${SENHA_MIN_CARACTERES} caracteres`
    );
  }
  if (!SENHA_REGEX_FORCA.test(senha)) {
    throw new BadRequestException(
      'Senha deve conter pelo menos 1 letra maiúscula, 1 número e 1 caractere especial'
    );
  }
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService
  ) {}

  async register(data: { email: string; password: string; name: string }) {
    validarForcaSenha(data.password);

    const existing = await this.prisma.usersProfile.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      throw new ConflictException('Este email já está cadastrado');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await this.prisma.usersProfile.create({
      data: {
        email: data.email,
        name: data.name,
        passwordHash,
        role: 'cliente' as UserRole,
      },
    });

    return this.generateTokens({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });
  }

  async login(data: { email: string; password: string }) {
    const user = await this.prisma.usersProfile.findUnique({
      where: { email: data.email },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Email ou senha incorretos');
    }

    const isPasswordValid = await bcrypt.compare(data.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email ou senha incorretos');
    }

    return this.generateTokens({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: (() => {
          const secret = process.env.JWT_REFRESH_SECRET;
          if (!secret) {
            throw new UnauthorizedException('JWT_REFRESH_SECRET não configurado');
          }
          return secret;
        })(),
      });

      const user = await this.prisma.usersProfile.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('Usuário não encontrado');
      }

      const accessToken = this.jwtService.sign({
        sub: user.id,
        email: user.email,
        role: user.role,
      });

      return { access_token: accessToken };
    } catch {
      throw new UnauthorizedException('Token inválido ou expirado');
    }
  }

  async validateUser(payload: { sub: string; email: string; role: string }) {
    const user = await this.prisma.usersProfile.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }

  private generateTokens(payload: {
    id: string;
    email: string;
    role: string;
    name: string;
  }): AuthResponse {
    const accessToken = this.jwtService.sign({
      sub: payload.id,
      email: payload.email,
      role: payload.role,
    });

    const refreshTokenSecret = process.env.JWT_REFRESH_SECRET;
    if (!refreshTokenSecret) {
      throw new Error('JWT_REFRESH_SECRET environment variable is required');
    }

    const refreshToken = this.jwtService.sign(
      { sub: payload.id },
      {
        secret: refreshTokenSecret,
        expiresIn: '7d',
      }
    );

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: payload.id,
        email: payload.email,
        name: payload.name,
        role: payload.role,
      },
    };
  }
}
