import { Module } from '@nestjs/common';

import { LgpdService } from './lgpd.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, LgpdService],
  exports: [UsersService, LgpdService],
})
export class UsersModule {}
