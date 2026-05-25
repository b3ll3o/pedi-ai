import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';

import { CombosService } from './combos.service';

interface CreateComboDto {
  restaurantId: string;
  name: string;
  description?: string | null;
  price: number;
  available?: boolean;
  items: Array<{ productId: string; quantity: number }>;
}

interface UpdateComboDto {
  name?: string;
  description?: string | null;
  price?: number;
  available?: boolean;
}

@Controller('combos')
export class CombosController {
  constructor(private readonly service: CombosService) {}

  @Get()
  async findByRestaurant(@Query('restaurantId') restaurantId: string) {
    return this.service.findByRestaurant(restaurantId);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post()
  async create(@Body() data: CreateComboDto) {
    return this.service.create(data);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() data: UpdateComboDto) {
    return this.service.update(id, data);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.service.delete(id);
    return { success: true };
  }
}
