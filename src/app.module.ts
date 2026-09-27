import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { HealthModule } from './modules/health/health.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { RestaurantsModule } from './modules/restaurants/restaurants.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { buildDataSourceOptions } from './config/data-source';
import { getRedisConnection } from './config/redis.config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(buildDataSourceOptions()),
    BullModule.forRoot({ connection: getRedisConnection() }),
    AuthModule,
    UsersModule,
    HealthModule,
    RoomsModule,
    BookingsModule,
    RestaurantsModule,
    PaymentsModule,
    NotificationsModule,
  ],
})
export class AppModule {}
