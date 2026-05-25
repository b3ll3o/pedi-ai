import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';

import { ModifierGroupsService } from './modifier-groups.service';

interface CreateModifierGroupDto {
  restaurantId: string;
  name: string;
  required?: boolean;
  minSelections?: number;
  maxSelections?: number;
}

interface AddModifierValueDto {
  name: string;
  priceAdjustment?: number;
}

interface UpdateModifierGroupDto {
  name?: string;
  required?: boolean;
  minSelections?: number;
  maxSelections?: number;
}

interface UpdateModifierValueDto {
  name?: string;
  priceAdjustment?: number;
  available?: boolean;
}

@Controller('modifier-groups')
export class ModifierGroupsController {
  constructor(private readonly service: ModifierGroupsService) {}

  @Get()
  async findByRestaurant(@Query('restaurantId') restaurantId: string) {
    return this.service.findByRestaurant(restaurantId);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post()
  async create(@Body() data: CreateModifierGroupDto) {
    return this.service.create(data);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() data: UpdateModifierGroupDto) {
    return this.service.update(id, data);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.service.delete(id);
    return { success: true };
  }

  @Post(':id/values')
  async addValue(@Param('id') id: string, @Body() data: AddModifierValueDto) {
    return this.service.addValue(id, data);
  }

  @Patch('values/:id')
  async updateValue(@Param('id') id: string, @Body() data: UpdateModifierValueDto) {
    return this.service.updateValue(id, data);
  }

  @Get('values/:id')
  async getValue(@Param('id') id: string) {
    return this.service.findValueById(id);
  }

  @Delete('values/:id')
  async deleteValue(@Param('id') id: string) {
    await this.service.deleteValue(id);
    return { success: true };
  }
}
