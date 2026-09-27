import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './payment.entity';
import { PaymentsService } from './payments.service';
import { StaffPaymentsController } from './staff-payments.controller';
import { PaymentInfoController } from './payment-info.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Payment])],
  controllers: [StaffPaymentsController, PaymentInfoController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
