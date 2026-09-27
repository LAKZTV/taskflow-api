import {
  BadRequestException, Controller, Get, Param, ParseUUIDPipe, Query,
  StreamableFile, UseGuards,
} from '@nestjs/common';
import { createReadStream } from 'fs';
import { PaymentsService } from './payments.service';
import { PaymentGatewayStatus } from './payment.entity';
import { toStaffPaymentView } from './payment.response';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';

/**
 * Read-only payment views for the back office. Confirming or rejecting a slip
 * is a `PATCH` handled in the bookings module (it also touches the booking and
 * notifications), which keeps this controller — and PaymentsModule — free of a
 * dependency on BookingsService.
 */
@Controller('staff/payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STAFF, UserRole.ADMIN)
export class StaffPaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  /** `GET /api/staff/payments?status=awaiting_verification` */
  @Get()
  async findAll(@Query('status') status?: string) {
    let filter: PaymentGatewayStatus | undefined;
    if (status !== undefined) {
      const values = Object.values(PaymentGatewayStatus) as string[];
      if (!values.includes(status)) {
        throw new BadRequestException('status ไม่ถูกต้อง');
      }
      filter = status as PaymentGatewayStatus;
    }
    const rows = await this.payments.findAll(filter);
    return rows.map(toStaffPaymentView);
  }

  /** `GET /api/staff/payments/:id/slip` — streams the uploaded slip image. */
  @Get(':id/slip')
  async slip(@Param('id', ParseUUIDPipe) id: string): Promise<StreamableFile> {
    const { path, contentType } = await this.payments.getSlipFile(id);
    return new StreamableFile(createReadStream(path), { type: contentType });
  }
}
