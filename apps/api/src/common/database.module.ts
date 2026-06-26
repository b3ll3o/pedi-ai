import { Module, Global } from '@nestjs/common';

import { PiiCryptoService } from './pii-crypto.service';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PiiCryptoService, PrismaService],
  exports: [PiiCryptoService, PrismaService],
})
export class DatabaseModule {}
