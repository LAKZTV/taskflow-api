import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UsersService } from './users.service';
import { StaffUsersController } from './staff-users.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [StaffUsersController],
  providers: [UsersService],
  exports: [UsersService, TypeOrmModule],
})
export class UsersModule {}
