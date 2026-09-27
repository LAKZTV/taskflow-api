/**
 * bullmq wants host/port (or an ioredis instance), not a bare URL, so this
 * parses `REDIS_URL` once for BullModule.forRoot. docker-compose.yml sets
 * `REDIS_URL=redis://redis:6379` automatically when the API itself runs in
 * the compose network; the default here matches the `6379:6379` host mapping
 * for running the API on the host instead.
 */
export function getRedisConnection() {
  const url = new URL(process.env.REDIS_URL ?? 'redis://localhost:6379');
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    password: url.password || undefined,
  };
}
