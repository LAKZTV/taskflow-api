import {
  Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { User, UserRole } from './user.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

/** Public shape — `password_hash` is `select: false`, so it cannot leak here. */
function toPublicUser(u: User) {
  return { id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role };
}

/**
 * Backs `AuthRepository.listUsers` / `createStaff` / `deleteUser` in the
 * Flutter app (manage_staff_screen). Listing is staff-visible; creating and
 * deleting accounts is admin-only.
 */
@Controller('staff/users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StaffUsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @Roles(UserRole.STAFF, UserRole.ADMIN)
  async findAll() {
    return (await this.users.list()).map(toPublicUser);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  async create(@Body() dto: CreateStaffDto) {
    return toPublicUser(await this.users.create(dto));
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(204)
  async remove(
    @CurrentUser() actor: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.users.remove(id, actor.sub);
  }
}
