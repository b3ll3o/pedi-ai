import { Module } from '@nestjs/common';

import { HealthController } from './health.controller';
import { HealthGranularController } from './health-granular.controller';

@Module({
  controllers: [HealthController, HealthGranularController],
})
export class HealthModule {}
