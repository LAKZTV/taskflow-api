import {
  Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne,
  PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { numericTransformer } from '../../common/numeric.transformer';
import { Booking } from '../bookings/booking.entity';
import { User } from '../users/user.entity';

export enum PaymentMethod {
  CARD = 'card',
  PROMPTPAY = 'promptpay',
}

/**
 * Manual QR-slip lifecycle (no automatic gateway):
 *   PENDING               – row exists, customer has not uploaded a slip yet
 *   AWAITING_VERIFICATION – slip uploaded, waiting for a staff member to check
 *   SUCCEEDED             – staff confirmed the slip; the booking is now paid
 *   REJECTED              – staff rejected the slip; customer may re-upload
 *   REFUNDED              – a paid booking was later cancelled
 *   FAILED                – reserved for a future real gateway
 */
export enum PaymentGatewayStatus {
  PENDING = 'pending',
  AWAITING_VERIFICATION = 'awaiting_verification',
  SUCCEEDED = 'succeeded',
  REJECTED = 'rejected',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

/**
 * One row per booking (1:1 — see the unique index on booking_id). No card
 * number, CVV, or bank-account number is ever stored. Payment is confirmed by
 * a human: the customer pays to the resort's static PromptPay QR and uploads a
 * transfer slip (`slip_path`), then a staff member verifies it
 * (`verified_by` / `verified_at`) and the status moves to `succeeded`.
 */
@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ name: 'booking_id', type: 'uuid' })
  bookingId!: string;

  @ManyToOne(() => Booking, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'booking_id' })
  booking!: Booking;

  @Column({ type: 'enum', enum: PaymentMethod, default: PaymentMethod.PROMPTPAY })
  method!: PaymentMethod;

  @Column({
    type: 'numeric', precision: 10, scale: 2, transformer: numericTransformer,
  })
  amount!: number;

  @Column({ name: 'gateway_ref', type: 'varchar', length: 100, nullable: true })
  gatewayRef!: string | null;

  @Index({ unique: true })
  @Column({ name: 'idempotency_key', length: 100 })
  idempotencyKey!: string;

  @Column({ type: 'enum', enum: PaymentGatewayStatus, default: PaymentGatewayStatus.PENDING })
  status!: PaymentGatewayStatus;

  /** Relative path (under UPLOAD_DIR) of the uploaded transfer slip image. */
  @Column({ name: 'slip_path', type: 'varchar', length: 255, nullable: true })
  slipPath!: string | null;

  @Column({ name: 'slip_uploaded_at', type: 'timestamptz', nullable: true })
  slipUploadedAt!: Date | null;

  /** The staff/admin user who approved or rejected the slip. */
  @Column({ name: 'verified_by', type: 'uuid', nullable: true })
  verifiedBy!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'verified_by' })
  verifier!: User | null;

  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
  verifiedAt!: Date | null;

  @Column({ name: 'reject_reason', type: 'varchar', length: 255, nullable: true })
  rejectReason!: string | null;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
