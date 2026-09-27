import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Sprint 1 — auth foundation: users + refresh_tokens.
 * Also enables btree_gist here so the Sprint 2 exclusion constraint
 * on bookings (room_id + daterange) has its extension ready.
 */
export class InitAuth1757400000000 implements MigrationInterface {
  name = 'InitAuth1757400000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
    await q.query(`CREATE EXTENSION IF NOT EXISTS "btree_gist"`);

    await q.query(`CREATE TYPE "users_role_enum" AS ENUM('customer', 'staff', 'admin')`);

    await q.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying(120) NOT NULL,
        "email" character varying(255) NOT NULL,
        "phone" character varying(30),
        "password_hash" character varying(100) NOT NULL,
        "role" "users_role_enum" NOT NULL DEFAULT 'customer',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
      )
    `);
    await q.query(`CREATE UNIQUE INDEX "UQ_users_email" ON "users" (LOWER("email"))`);

    await q.query(`
      CREATE TABLE "refresh_tokens" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "token_hash" character varying(64) NOT NULL,
        "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "revoked_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_refresh_tokens_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_refresh_tokens_hash" UNIQUE ("token_hash"),
        CONSTRAINT "FK_refresh_tokens_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await q.query(`CREATE INDEX "IDX_refresh_tokens_user" ON "refresh_tokens" ("user_id")`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE "refresh_tokens"`);
    await q.query(`DROP INDEX "UQ_users_email"`);
    await q.query(`DROP TABLE "users"`);
    await q.query(`DROP TYPE "users_role_enum"`);
  }
}
