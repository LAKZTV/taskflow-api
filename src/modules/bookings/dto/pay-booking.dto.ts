import { IsEnum, IsOptional } from 'class-validator';
import { PaymentMethod } from '../../payments/payment.entity';

/**
 * `POST /api/bookings/:id/pay`. `method` is optional because the current
 * Flutter `ApiBookingRepository.createAndPay` posts no body at all — defaults
 * to `card` so that call keeps working unchanged.
 */
export class PayBookingDto {
  @IsOptional() @IsEnum(PaymentMethod)
  method?: PaymentMethod;
}
