import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Sprint 4 — restaurants, payments, notifications_log.
 *
 * `restaurants` has no FK to anything else (see docs/database-schema.md
 * section 3.7 — `distanceKm` in the Flutter model is computed at query time,
 * never stored). `payments` is a strict 1:1 with `bookings` via the unique
 * index on `booking_id`; no card data is ever stored, only `gateway_ref` for
 * a future real gateway. `notifications_log` cascades on booking delete since
 * a notification about a booking that no longer exists is meaningless.
 */
export class RestaurantsPaymentsNotifications1757600000000 implements MigrationInterface {
  name = 'RestaurantsPaymentsNotifications1757600000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TYPE "payments_method_enum" AS ENUM('card', 'promptpay')`);
    await q.query(`CREATE TYPE "payments_status_enum" AS ENUM('pending', 'succeeded', 'failed', 'refunded')`);
    await q.query(`CREATE TYPE "notifications_log_channel_enum" AS ENUM('email', 'sms')`);
    await q.query(`CREATE TYPE "notifications_log_status_enum" AS ENUM('queued', 'sent', 'failed')`);

    await q.query(`
      CREATE TABLE "restaurants" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying(120) NOT NULL,
        "cuisine" character varying(60) NOT NULL,
        "rating" numeric(2,1) NOT NULL,
        "price_range" character varying(10) NOT NULL,
        "description" text NOT NULL,
        "image_url" character varying(500) NOT NULL,
        "address" character varying(255) NOT NULL,
        "latitude" numeric(9,6) NOT NULL,
        "longitude" numeric(9,6) NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_restaurants_id" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_restaurants_rating_range" CHECK ("rating" >= 0 AND "rating" <= 5)
      )
    `);

    await q.query(`
      CREATE TABLE "payments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "booking_id" uuid NOT NULL,
        "method" "payments_method_enum" NOT NULL,
        "amount" numeric(10,2) NOT NULL,
        "gateway_ref" character varying(100),
        "idempotency_key" character varying(100) NOT NULL,
        "status" "payments_status_enum" NOT NULL DEFAULT 'pending',
        "paid_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payments_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_payments_booking" UNIQUE ("booking_id"),
        CONSTRAINT "UQ_payments_idempotency_key" UNIQUE ("idempotency_key"),
        CONSTRAINT "FK_payments_booking" FOREIGN KEY ("booking_id")
          REFERENCES "bookings"("id") ON DELETE RESTRICT,
        CONSTRAINT "CHK_payments_amount_positive" CHECK ("amount" > 0)
      )
    `);

    await q.query(`
      CREATE TABLE "notifications_log" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "booking_id" uuid NOT NULL,
        "channel" "notifications_log_channel_enum" NOT NULL,
        "recipient" character varying(255) NOT NULL,
        "payload" jsonb NOT NULL,
        "status" "notifications_log_status_enum" NOT NULL DEFAULT 'queued',
        "attempts" smallint NOT NULL DEFAULT 0,
        "last_error" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notifications_log_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notifications_log_booking" FOREIGN KEY ("booking_id")
          REFERENCES "bookings"("id") ON DELETE CASCADE
      )
    `);
    await q.query(`CREATE INDEX "IDX_notifications_log_booking" ON "notifications_log" ("booking_id")`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE "notifications_log"`);
    await q.query(`DROP TABLE "payments"`);
    await q.query(`DROP TABLE "restaurants"`);
    await q.query(`DROP TYPE "notifications_log_status_enum"`);
    await q.query(`DROP TYPE "notifications_log_channel_enum"`);
    await q.query(`DROP TYPE "payments_status_enum"`);
    await q.query(`DROP TYPE "payments_method_enum"`);
  }
}
