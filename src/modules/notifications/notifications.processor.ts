import { Processor, WorkerHost } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { Repository } from 'typeorm';
import { BookingConfirmationJobData, NOTIFICATIONS_QUEUE } from './notifications.service';
import { NotificationLog, NotificationStatus } from './notification-log.entity';

/**
 * No real email/SMS provider is wired up yet — this stub "sends" by logging
 * and marking the row `sent`. Swap the body of `send()` for e.g. a
 * nodemailer/SMS-API call; the retry/backoff and `notifications_log` audit
 * trail around it already work and do not need to change.
 */
@Processor(NOTIFICATIONS_QUEUE)
export class NotificationsProcessor extends WorkerHost {
  constructor(
    @InjectRepository(NotificationLog) private readonly repo: Repository<NotificationLog>,
  ) {
    super();
  }

  async process(job: Job<BookingConfirmationJobData>): Promise<void> {
    const log = await this.repo.findOne({ where: { id: job.data.notificationLogId } });
    if (!log) return;

    log.attempts += 1;
    try {
      await this.send(log);
      log.status = NotificationStatus.SENT;
      log.lastError = null;
      await this.repo.save(log);
    } catch (err) {
      log.status = NotificationStatus.FAILED;
      log.lastError = err instanceof Error ? err.message : String(err);
      await this.repo.save(log);
      throw err; // BullMQ retries per the job's attempts/backoff config.
    }
  }

  private async send(log: NotificationLog): Promise<void> {
    console.log(`[notifications] stub-sending ${log.channel} to ${log.recipient}`, log.payload);
  }
}
