import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Sprint 4 — manual QR-slip payment verification.
 *
 * The customer transfers to the resort's static PromptPay QR and uploads a
 * transfer slip; a staff member then confirms or rejects it. This adds the two
 * new lifecycle states and the slip / verification columns to `payments`.
 *
 * `ALTER TYPE ... ADD VALUE` runs fine inside the migration transaction on
 * PostgreSQL 12+ as long as the new label is not *used* in the same
 * transaction — here it is only declared, so this is safe on PG16.
 */
export class PaymentSlipVerification1757700000000 implements MigrationInterface {
  name = 'PaymentSlipVerification1757700000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TYPE "payments_status_enum" ADD VALUE IF NOT EXISTS 'awaiting_verification'`);
    await q.query(`ALTER TYPE "payments_status_enum" ADD VALUE IF NOT EXISTS 'rejected'`);

    // New default for the manual flow: PromptPay instead of card.
    await q.query(`ALTER TABLE "payments" ALTER COLUMN "method" SET DEFAULT 'promptpay'`);

    await q.query(`ALTER TABLE "payments" ADD COLUMN "slip_path" varchar(255)`);
    await q.query(`ALTER TABLE "payments" ADD COLUMN "slip_uploaded_at" timestamptz`);
    await q.query(`ALTER TABLE "payments" ADD COLUMN "verified_by" uuid`);
    await q.query(`ALTER TABLE "payments" ADD COLUMN "verified_at" timestamptz`);
    await q.query(`ALTER TABLE "payments" ADD COLUMN "reject_reason" varchar(255)`);

    await q.query(`
      ALTER TABLE "payments"
      ADD CONSTRAINT "FK_payments_verified_by"
      FOREIGN KEY ("verified_by") REFERENCES "users"("id") ON DELETE SET NULL
    `);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "payments" DROP CONSTRAINT "FK_payments_verified_by"`);
    await q.query(`ALTER TABLE "payments" DROP COLUMN "reject_reason"`);
    await q.query(`ALTER TABLE "payments" DROP COLUMN "verified_at"`);
    await q.query(`ALTER TABLE "payments" DROP COLUMN "verified_by"`);
    await q.query(`ALTER TABLE "payments" DROP COLUMN "slip_uploaded_at"`);
    await q.query(`ALTER TABLE "payments" DROP COLUMN "slip_path"`);
    await q.query(`ALTER TABLE "payments" ALTER COLUMN "method" SET DEFAULT 'card'`);
    // Postgres cannot drop an enum value; 'awaiting_verification' and
    // 'rejected' remain on payments_status_enum after a down-migration.
  }
}
