import { Controller, Get, Patch, Body, UseGuards, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/types/auth.types';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getMe(@Req() req: { user: AuthenticatedUser }) {
    return this.usersService.findById(req.user.id);
  }

  @Patch('me')
  async updateMe(
    @Req() _req: { user: AuthenticatedUser },
    @Body() _updateData: { name?: string },
  ) {
    return { message: 'User updated' };
  }
}
