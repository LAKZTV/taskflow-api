import { Type } from 'class-transformer';
import {
  ArrayMaxSize, IsArray, IsEnum, IsInt, IsNumber, IsOptional, IsString, Length, Max, Min,
} from 'class-validator';
import { RoomStatus, RoomType } from '../room.entity';

export class CreateRoomDto {
  @IsString() @Length(1, 120)
  name!: string;

  @IsEnum(RoomType)
  type!: RoomType;

  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(1) @Max(99_999_999)
  pricePerNight!: number;

  @Type(() => Number) @IsInt() @Min(1) @Max(20)
  capacity!: number;

  @IsOptional() @IsString() @Length(0, 4000)
  description?: string;

  @IsOptional() @IsArray() @IsString({ each: true }) @ArrayMaxSize(20)
  imageUrls?: string[];

  @IsOptional() @IsArray() @IsString({ each: true }) @ArrayMaxSize(50)
  amenities?: string[];

  @IsOptional() @IsEnum(RoomStatus)
  status?: RoomStatus;
}
