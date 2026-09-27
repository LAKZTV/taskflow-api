import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { Booking } from '../bookings/booking.entity';
import { NotificationChannel, NotificationLog, NotificationStatus } from './notification-log.entity';

export const NOTIFICATIONS_QUEUE = 'notifications';
export const BOOKING_CONFIRMATION_JOB = 'booking-confirmation';

export interface BookingConfirmationJobData {
  notificationLogId: string;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(NotificationLog) private readonly repo: Repository<NotificationLog>,
    @InjectQueue(NOTIFICATIONS_QUEUE) private readonly queue: Queue<BookingConfirmationJobData>,
  ) {}

  /**
   * Writes the `queued` row first, then hands only its id to the job — the
   * worker re-reads the row rather than carrying the payload through the
   * queue, so retries always see the latest `attempts`/`status`.
   */
  async sendBookingConfirmation(booking: Booking, recipient: string): Promise<void> {
    const log = await this.repo.save(this.repo.create({
      bookingId: booking.id,
      channel: NotificationChannel.EMAIL,
      recipient,
      payload: {
        bookingId: booking.id,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        totalPrice: booking.totalPrice,
      },
      status: NotificationStatus.QUEUED,
    }));

    await this.queue.add(
      BOOKING_CONFIRMATION_JOB,
      { notificationLogId: log.id },
      { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
    );
  }
}
