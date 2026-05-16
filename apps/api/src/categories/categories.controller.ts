import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  async findByRestaurant(@Query('restaurantId') restaurantId: string) {
    return this.categoriesService.findByRestaurant(restaurantId);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.categoriesService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() data: {
    restaurantId: string;
    name: string;
    description?: string;
    imageUrl?: string;
    sortOrder?: number;
  }) {
    return this.categoriesService.create(data);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() data: { name?: string; description?: string; sortOrder?: number },
  ) {
    return this.categoriesService.update(id, data);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id') id: string) {
    await this.categoriesService.delete(id);
    return { success: true };
  }

  @Post('reorder')
  @UseGuards(JwtAuthGuard)
  async reorder(@Body() categories: Array<{ id: string; sortOrder: number }>) {
    await this.categoriesService.reorder(categories);
    return { success: true };
  }
}
