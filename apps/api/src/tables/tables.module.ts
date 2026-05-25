import { Module } from '@nestjs/common';

import { TablesController } from './tables.controller';
import { TablesService } from './tables.service';
import { QRCodeCryptoService } from './qr-crypto.service';

@Module({
  controllers: [TablesController],
  providers: [TablesService, QRCodeCryptoService],
})
export class TablesModule {}
