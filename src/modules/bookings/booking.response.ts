import { Booking } from './booking.entity';

/**
 * Flat shape matching frontend/lib/models/booking.dart, which carries
 * `roomName` and `customerName` denormalized. They are joined here rather than
 * stored on the row, so renaming a room does not leave stale copies behind.
 */
export interface BookingResponse {
  id: string;
  roomId: string;
  roomName: string;
  customerId: string;
  customerName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  totalPrice: number;
  status: string;
  paymentStatus: string;
  createdAt: Date;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function nightsBetween(checkIn: string, checkOut: string): number {
  return Math.round(
    (Date.parse(`${checkOut}T00:00:00Z`) - Date.parse(`${checkIn}T00:00:00Z`)) / MS_PER_DAY,
  );
}

export function toBookingResponse(b: Booking): BookingResponse {
  return {
    id: b.id,
    roomId: b.roomId,
    roomName: b.room?.name ?? '',
    customerId: b.customerId,
    customerName: b.customer?.name ?? '',
    checkIn: b.checkIn,
    checkOut: b.checkOut,
    nights: nightsBetween(b.checkIn, b.checkOut),
    guests: b.guests,
    totalPrice: b.totalPrice,
    status: b.status,
    paymentStatus: b.paymentStatus,
    createdAt: b.createdAt,
  };
}
