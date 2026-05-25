import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { PrismaService } from '../common/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.usersProfile.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.usersProfile.findUnique({ where: { email } });
  }

  async findByRestaurant(restaurantId: string) {
    return this.prisma.usersProfile.findMany({
      where: { restaurantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createProfile(data: { restaurantId: string; email: string; name: string; role: UserRole }) {
    const existing = await this.prisma.usersProfile.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      throw new ConflictException('Já existe um usuário com este email');
    }

    return this.prisma.usersProfile.create({
      data: {
        restaurantId: data.restaurantId,
        email: data.email,
        name: data.name,
        role: data.role,
        userId: null,
      },
    });
  }

  async updateProfile(userId: string, data: { name?: string; email?: string; role?: UserRole }) {
    const user = await this.prisma.usersProfile.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return this.prisma.usersProfile.update({
      where: { id: userId },
      data: {
        name: data.name ?? user.name,
        email: data.email ?? user.email,
        role: data.role ?? user.role,
      },
    });
  }

  async deleteProfile(userId: string) {
    const user = await this.prisma.usersProfile.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    await this.prisma.usersProfile.delete({ where: { id: userId } });
    return { success: true };
  }

  async getProfilesByUserId(userId: string) {
    return this.prisma.usersProfile.findMany({
      where: { userId },
      include: { restaurant: true },
    });
  }

  async updateRole(userId: string, role: UserRole) {
    await this.prisma.usersProfile.update({
      where: { id: userId },
      data: { role },
    });
  }
}
