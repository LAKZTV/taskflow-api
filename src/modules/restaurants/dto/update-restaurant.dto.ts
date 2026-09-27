import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class UpdateRestaurantDto {
  @IsOptional() @IsString() @Length(1, 120)
  name?: string;

  @IsOptional() @IsString() @Length(1, 60)
  cuisine?: string;

  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 1 }) @Min(0) @Max(5)
  rating?: number;

  @IsOptional() @IsString() @Length(1, 10)
  priceRange?: string;

  @IsOptional() @IsString() @Length(1, 4000)
  description?: string;

  @IsOptional() @IsString() @Length(1, 500)
  imageUrl?: string;

  @IsOptional() @IsString() @Length(1, 255)
  address?: string;

  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 6 }) @Min(-90) @Max(90)
  latitude?: number;

  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 6 }) @Min(-180) @Max(180)
  longitude?: number;
}
