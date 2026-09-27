import {
  BadRequestException, ConflictException, Injectable, NotFoundException, OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import { join } from 'path';
import { Payment, PaymentGatewayStatus, PaymentMethod } from './payment.entity';
import {
  ALLOWED_SLIP_MIME, getPaymentConfig, PaymentConfig,
} from '../../config/payment.config';
import { UploadedSlip } from './payment.response';

const RELATIONS = { booking: { customer: true, room: true } } as const;

/**
 * Persistence for the manual QR-slip flow. This service owns the `payments`
 * rows AND the slip image files on disk, but knows nothing about bookings or
 * notifications — orchestrating those on approval is `BookingsService`'s job,
 * which keeps the dependency direction one-way (Bookings -> Payments).
 */
@Injectable()
export class PaymentsService implements OnModuleInit {
  private readonly cfg: PaymentConfig = getPaymentConfig();

  constructor(
    @InjectRepository(Payment) private readonly repo: Repository<Payment>,
  ) {}

  async onModuleInit(): Promise<void> {
    await fs.mkdir(this.cfg.slipDir, { recursive: true });
  }

  /** `GET /api/staff/payments` (optionally filtered by status). */
  findAll(status?: PaymentGatewayStatus): Promise<Payment[]> {
    return this.repo.find({
      where: status ? { status } : {},
      relations: RELATIONS,
      order: { createdAt: 'DESC' },
    });
  }

  findById(id: string): Promise<Payment | null> {
    return this.repo.findOne({ where: { id }, relations: RELATIONS });
  }

  async getOrFail(id: string): Promise<Payment> {
    const payment = await this.findById(id);
    if (!payment) throw new NotFoundException('ไม่พบรายการชำระเงิน');
    return payment;
  }

  findForBooking(bookingId: string): Promise<Payment | null> {
    return this.repo.findOne({ where: { bookingId } });
  }

  /**
   * Customer uploads a transfer slip. Writes the image to disk and moves the
   * (1:1) payment row to `awaiting_verification`, clearing any previous
   * verification/rejection so a re-upload after a rejection starts clean.
   * Refuses if the booking is already paid.
   */
  async submitSlip(
    bookingId: string,
    amount: number,
    file: UploadedSlip,
    method: PaymentMethod = PaymentMethod.PROMPTPAY,
  ): Promise<Payment> {
    const ext = ALLOWED_SLIP_MIME[file.mimetype];
    if (!ext) {
      throw new BadRequestException('รองรับเฉพาะไฟล์รูปภาพ PNG, JPG หรือ WEBP');
    }
    if (file.size > this.cfg.maxSlipBytes) {
      const mb = Math.round(this.cfg.maxSlipBytes / (1024 * 1024));
      throw new BadRequestException(`ไฟล์สลิปต้องไม่เกิน ${mb} MB`);
    }

    const existing = await this.repo.findOne({ where: { bookingId } });
    if (existing && existing.status === PaymentGatewayStatus.SUCCEEDED) {
      throw new ConflictException('การจองนี้ชำระเงินและได้รับการยืนยันแล้ว');
    }

    const relPath = join('slips', `${bookingId}.${ext}`);
    const absPath = join(this.cfg.uploadDir, relPath);
    await fs.writeFile(absPath, file.buffer);

    // A previous slip with a different extension would otherwise linger.
    if (existing?.slipPath && existing.slipPath !== relPath) {
      await fs.rm(join(this.cfg.uploadDir, existing.slipPath), { force: true });
    }

    const payment = existing ?? this.repo.create({
      bookingId,
      idempotencyKey: randomUUID(),
    });
    payment.method = method;
    payment.amount = amount;
    payment.status = PaymentGatewayStatus.AWAITING_VERIFICATION;
    payment.slipPath = relPath;
    payment.slipUploadedAt = new Date();
    payment.verifiedBy = null;
    payment.verifiedAt = null;
    payment.rejectReason = null;
    payment.paidAt = null;
    return this.repo.save(payment);
  }

  /**
   * Staff confirms a slip. Only a payment that is actually awaiting
   * verification can be approved — this guards against double-confirming.
   */
  async markVerified(paymentId: string, adminId: string): Promise<Payment> {
    const payment = await this.getOrFail(paymentId);
    if (payment.status !== PaymentGatewayStatus.AWAITING_VERIFICATION) {
      throw new ConflictException('รายการนี้ไม่ได้อยู่ในสถานะรอตรวจสอบ');
    }
    payment.status = PaymentGatewayStatus.SUCCEEDED;
    payment.verifiedBy = adminId;
    payment.verifiedAt = new Date();
    payment.paidAt = new Date();
    payment.rejectReason = null;
    return this.repo.save(payment);
  }

  /** Staff rejects a slip; the customer may upload a new one. */
  async markRejected(paymentId: string, adminId: string, reason: string): Promise<Payment> {
    const payment = await this.getOrFail(paymentId);
    if (payment.status !== PaymentGatewayStatus.AWAITING_VERIFICATION) {
      throw new ConflictException('รายการนี้ไม่ได้อยู่ในสถานะรอตรวจสอบ');
    }
    payment.status = PaymentGatewayStatus.REJECTED;
    payment.verifiedBy = adminId;
    payment.verifiedAt = new Date();
    payment.rejectReason = reason;
    return this.repo.save(payment);
  }

  /** Marks the booking's payment refunded when a paid booking is cancelled. */
  async recordRefund(bookingId: string): Promise<void> {
    const payment = await this.repo.findOne({ where: { bookingId } });
    if (!payment || payment.status !== PaymentGatewayStatus.SUCCEEDED) return;
    payment.status = PaymentGatewayStatus.REFUNDED;
    await this.repo.save(payment);
  }

  /** Absolute path + content-type of a slip image, for staff to view it. */
  async getSlipFile(paymentId: string): Promise<{ path: string; contentType: string }> {
    const payment = await this.getOrFail(paymentId);
    if (!payment.slipPath) {
      throw new NotFoundException('ยังไม่มีสลิปสำหรับรายการนี้');
    }
    const ext = payment.slipPath.split('.').pop();
    const contentType = ext === 'png' ? 'image/png'
      : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    return { path: join(this.cfg.uploadDir, payment.slipPath), contentType };
  }
}
