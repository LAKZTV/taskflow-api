# Poonsuk Resort — Backend API

NestJS + PostgreSQL + TypeORM backend replacing `lib/data/mock_data.dart`
in the Flutter app. See `docs/Backend_Design_Poonsuk_Resort.docx` for the
full architecture design.

## Sprint status

| Sprint | Scope | Status |
|---|---|---|
| 1 | Auth vertical slice (users, refresh_tokens, JWT, guards, health, Docker) | scaffolded |
| 2 | Rooms + Bookings, exclusion constraint, concurrency test | not started |
| 3 | Redis cache / lock, BullMQ notifications, payments | not started |
| 4 | Nginx LB, read-replica, observability | not started |

## Run locally

```bash
cp .env.example .env          # then edit the JWT secrets
docker compose up -d postgres redis
npm install
npm run migration:run
npm run start:dev             # http://localhost:3000
```

Full container run (API in Docker too):

```bash
docker compose up --build
```

## Endpoints in Sprint 1

| Method | Path | Notes |
|---|---|---|
| POST | `/api/auth/register` | returns access + refresh token + user |
| POST | `/api/auth/login` | same shape |
| POST | `/api/auth/refresh` | rotates the refresh token |
| POST | `/api/auth/logout` | revokes the refresh token (204) |
| GET | `/api/auth/me` | requires `Authorization: Bearer <access>` |
| GET | `/health/live` | liveness, no dependency check |
| GET | `/health/ready` | readiness, pings the database |

## Conventions

- `synchronize` is permanently `false`. Every schema change is a migration:
  `npm run migration:generate -- src/migrations/<Name>`
- Passwords are bcrypt hashes (cost 12); `password_hash` is `select: false`.
- Refresh tokens are stored as sha256 hashes and rotated on every use.
- `ValidationPipe` runs with `whitelist` + `forbidNonWhitelisted` globally.
- Role checks: `@UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.ADMIN)`.

## Next step (Sprint 2)

1. `rooms` and `bookings` migrations — add the exclusion constraint first:
   `EXCLUDE USING gist (room_id WITH =, daterange(check_in, check_out, '[)') WITH &&) WHERE (status <> 'cancelled')`
2. `GET /api/rooms` availability search (no cache yet).
3. `POST /api/bookings` inside a SERIALIZABLE transaction.
4. Integration test: two concurrent bookings for the same room/date →
   exactly one 201 and one 409.
