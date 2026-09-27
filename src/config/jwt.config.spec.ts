import { Logger } from '@nestjs/common';
import { getJwtAccessSecret } from './jwt.config';

describe('getJwtAccessSecret', () => {
  const saved = { ...process.env };

  afterEach(() => {
    process.env = { ...saved };
    jest.restoreAllMocks();
  });

  it('returns JWT_ACCESS_SECRET when it is set', () => {
    process.env.JWT_ACCESS_SECRET = 'from-env';
    expect(getJwtAccessSecret()).toBe('from-env');
  });

  it('falls back to the dev secret and logs a warning when unset', () => {
    delete process.env.JWT_ACCESS_SECRET;
    const warn = jest.spyOn(Logger, 'warn').mockImplementation(() => undefined);
    expect(getJwtAccessSecret()).toBe('change-me-access-secret');
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
