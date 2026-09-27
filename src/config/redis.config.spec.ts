import { getRedisConnection } from './redis.config';

describe('getRedisConnection', () => {
  const saved = { ...process.env };

  afterEach(() => {
    process.env = { ...saved };
  });

  it('defaults to localhost:6379', () => {
    delete process.env.REDIS_URL;
    expect(getRedisConnection()).toEqual({
      host: 'localhost',
      port: 6379,
      password: undefined,
    });
  });

  it('parses host, port and password from REDIS_URL', () => {
    process.env.REDIS_URL = 'redis://:s3cret@cache.internal:6380';
    expect(getRedisConnection()).toEqual({
      host: 'cache.internal',
      port: 6380,
      password: 's3cret',
    });
  });
});
