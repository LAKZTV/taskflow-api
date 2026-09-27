import {
  Body, Controller, Param, ParseUUIDPipe, Patch, UseGuards,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { VerifyPaymentAction, VerifyPaymentDto } from '../payments/dto/verify-payment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../users/user.entity';

/**
 * The staff action on a payment: confirm or reject an uploaded slip. It lives
 * in the bookings module because approving also flips the booking to
 * paid/approved and queues the confirmation notification.
 */
@Controller('staff/payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STAFF, UserRole.ADMIN)
export class StaffPaymentActionsController {
  constructor(private readonly bookings: BookingsService) {}

  @Patch(':id')
  verify(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VerifyPaymentDto,
  ) {
    return dto.action === VerifyPaymentAction.APPROVE
      ? this.bookings.verifyPayment(id, user.sub)
      : this.bookings.rejectPayment(id, user.sub, dto.reason ?? '');
  }
}
