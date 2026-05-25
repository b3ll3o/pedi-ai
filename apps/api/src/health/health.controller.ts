import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('health')
@Controller()
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Health check da API' })
  @ApiResponse({ status: 200, description: 'API healthy' })
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
