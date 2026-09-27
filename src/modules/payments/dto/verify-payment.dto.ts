import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export enum VerifyPaymentAction {
  APPROVE = 'approve',
  REJECT = 'reject',
}

/** `PATCH /api/staff/payments/:id`. `reason` is required when rejecting. */
export class VerifyPaymentDto {
  @IsEnum(VerifyPaymentAction)
  action!: VerifyPaymentAction;

  @IsOptional() @IsString() @MaxLength(255)
  reason?: string;
}
