import { Type } from 'class-transformer';
import {
  ArrayMaxSize, IsArray, IsEnum, IsInt, IsNumber, IsOptional, IsString, Length, Max, Min,
} from 'class-validator';
import { RoomStatus, RoomType } from '../room.entity';

/**
 * `PATCH /api/staff/rooms/:id` covers all three Flutter calls
 * (updateRoom / updatePrice / updateStatus) — they differ only in which fields
 * they send. Written out rather than derived with `PartialType` to avoid
 * pulling in @nestjs/mapped-types for one class.
 */
export class UpdateRoomDto {
  @IsOptional() @IsString() @Length(1, 120)
  name?: string;

  @IsOptional() @IsEnum(RoomType)
  type?: RoomType;

  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(1) @Max(99_999_999)
  pricePerNight?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(20)
  capacity?: number;

  @IsOptional() @IsString() @Length(0, 4000)
  description?: string;

  @IsOptional() @IsArray() @IsString({ each: true }) @ArrayMaxSize(20)
  imageUrls?: string[];

  @IsOptional() @IsArray() @IsString({ each: true }) @ArrayMaxSize(50)
  amenities?: string[];

  @IsOptional() @IsEnum(RoomStatus)
  status?: RoomStatus;
}
