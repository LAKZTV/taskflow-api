import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { RestaurantsService } from './restaurants.service';

/** Public catalogue — browsing restaurants does not require a login. */
@Controller('restaurants')
export class RestaurantsController {
  constructor(private readonly restaurants: RestaurantsService) {}

  @Get()
  findAll() {
    return this.restaurants.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.restaurants.getOrFail(id);
  }
}
