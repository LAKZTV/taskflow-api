import { Payment } from './payment.entity';

/**
 * The framework hands multer's file object here. We deliberately type only the
 * fields we use instead of pulling in `@types/multer`, so no extra dependency
 * is needed just for a type.
 */
export interface UploadedSlip {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

/** What the customer is allowed to see about their own payment. */
export interface CustomerPaymentView {
  id: string;
  bookingId: string;
  amount: number;
  method: string;
  status: string;
  hasSlip: boolean;
  slipUploadedAt: Date | null;
  rejectReason: string | null;
}

export function toCustomerPaymentView(p: Payment): CustomerPaymentView {
  return {
    id: p.id,
    bookingId: p.bookingId,
    amount: p.amount,
    method: p.method,
    status: p.status,
    hasSlip: Boolean(p.slipPath),
    slipUploadedAt: p.slipUploadedAt,
    rejectReason: p.rejectReason,
  };
}

/** The back-office view — adds the audit trail and a booking summary. */
export interface StaffPaymentView extends CustomerPaymentView {
  customerId: string;
  customerName: string;
  roomName: string;
  checkIn: string | null;
  checkOut: string | null;
  verifiedBy: string | null;
  verifiedAt: Date | null;
  createdAt: Date;
}

export function toStaffPaymentView(p: Payment): StaffPaymentView {
  return {
    ...toCustomerPaymentView(p),
    customerId: p.booking?.customerId ?? '',
    customerName: p.booking?.customer?.name ?? '',
    roomName: p.booking?.room?.name ?? '',
    checkIn: p.booking?.checkIn ?? null,
    checkOut: p.booking?.checkOut ?? null,
    verifiedBy: p.verifiedBy,
    verifiedAt: p.verifiedAt,
    createdAt: p.createdAt,
  };
}
