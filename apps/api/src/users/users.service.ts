import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { UserRole } from '@prisma/client';

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

  async updateRole(userId: string, role: UserRole) {
    await this.prisma.usersProfile.update({
      where: { id: userId },
      data: { role },
    });
  }
}
