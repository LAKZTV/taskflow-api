import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Restaurant } from './restaurant.entity';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';

@Injectable()
export class RestaurantsService {
  constructor(
    @InjectRepository(Restaurant) private readonly repo: Repository<Restaurant>,
  ) {}

  /** `GET /api/restaurants`. No filters yet — the app lists all of them. */
  findAll(): Promise<Restaurant[]> {
    return this.repo.find({ order: { rating: 'DESC' } });
  }

  async getOrFail(id: string): Promise<Restaurant> {
    const restaurant = await this.repo.findOne({ where: { id } });
    if (!restaurant) throw new NotFoundException('ไม่พบร้านอาหาร');
    return restaurant;
  }

  create(dto: CreateRestaurantDto): Promise<Restaurant> {
    return this.repo.save(this.repo.create(dto));
  }

  async update(id: string, dto: UpdateRestaurantDto): Promise<Restaurant> {
    const restaurant = await this.getOrFail(id);
    Object.assign(restaurant, dto);
    return this.repo.save(restaurant);
  }

  /** No booking history ever references a restaurant, so this is a plain hard delete. */
  async remove(id: string): Promise<void> {
    const restaurant = await this.getOrFail(id);
    await this.repo.remove(restaurant);
  }
}
