import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Sprint 2 — rooms + bookings.
 *
 * The exclusion constraint is created here, BEFORE any booking service code
 * exists, so double-booking is impossible at the storage layer regardless of
 * what the application does. `btree_gist` was enabled in InitAuth1757400000000.
 *
 * Dates are stored as plain `date` (not timestamptz): a check-in is a calendar
 * day at the resort, not an instant, so no timezone conversion must ever apply.
 * `daterange(check_in, check_out, '[)')` makes check-out day exclusive, so
 * a guest leaving on the 5th does not block a guest arriving on the 5th.
 */
export class RoomsBookings1757500000000 implements MigrationInterface {
  name = 'RoomsBookings1757500000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TYPE "rooms_type_enum" AS ENUM('standard', 'deluxe', 'suite', 'family')`);
    await q.query(`CREATE TYPE "rooms_status_enum" AS ENUM('available', 'maintenance')`);
    await q.query(`CREATE TYPE "bookings_status_enum" AS ENUM('pending', 'approved', 'cancelled')`);
    await q.query(`CREATE TYPE "bookings_payment_status_enum" AS ENUM('unpaid', 'paid', 'refunded')`);

    await q.query(`
      CREATE TABLE "rooms" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying(120) NOT NULL,
        "type" "rooms_type_enum" NOT NULL,
        "price_per_night" numeric(10,2) NOT NULL,
        "capacity" integer NOT NULL,
        "description" text NOT NULL DEFAULT '',
        "image_urls" text[] NOT NULL DEFAULT '{}',
        "amenities" text[] NOT NULL DEFAULT '{}',
        "status" "rooms_status_enum" NOT NULL DEFAULT 'available',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_rooms_id" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_rooms_price_positive" CHECK ("price_per_night" > 0),
        CONSTRAINT "CHK_rooms_capacity_positive" CHECK ("capacity" > 0)
      )
    `);
    await q.query(`CREATE INDEX "IDX_rooms_status" ON "rooms" ("status")`);

    await q.query(`
      CREATE TABLE "bookings" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "room_id" uuid NOT NULL,
        "customer_id" uuid NOT NULL,
        "check_in" date NOT NULL,
        "check_out" date NOT NULL,
        "guests" integer NOT NULL,
        "total_price" numeric(10,2) NOT NULL,
        "status" "bookings_status_enum" NOT NULL DEFAULT 'pending',
        "payment_status" "bookings_payment_status_enum" NOT NULL DEFAULT 'unpaid',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_bookings_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_bookings_room" FOREIGN KEY ("room_id")
          REFERENCES "rooms"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_bookings_customer" FOREIGN KEY ("customer_id")
          REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "CHK_bookings_range" CHECK ("check_out" > "check_in"),
        CONSTRAINT "CHK_bookings_guests_positive" CHECK ("guests" > 0)
      )
    `);

    // The whole point of Sprint 2: two overlapping live bookings for the same
    // room cannot coexist, even under concurrent transactions.
    await q.query(`
      ALTER TABLE "bookings"
      ADD CONSTRAINT "EXC_bookings_no_overlap"
      EXCLUDE USING gist (
        room_id WITH =,
        daterange(check_in, check_out, '[)') WITH &&
      ) WHERE (status <> 'cancelled')
    `);

    await q.query(`CREATE INDEX "IDX_bookings_customer" ON "bookings" ("customer_id")`);
    await q.query(`CREATE INDEX "IDX_bookings_room_checkin" ON "bookings" ("room_id", "check_in")`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE "bookings"`);
    await q.query(`DROP TABLE "rooms"`);
    await q.query(`DROP TYPE "bookings_payment_status_enum"`);
    await q.query(`DROP TYPE "bookings_status_enum"`);
    await q.query(`DROP TYPE "rooms_status_enum"`);
    await q.query(`DROP TYPE "rooms_type_enum"`);
  }
}
