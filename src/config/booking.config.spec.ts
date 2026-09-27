import { getBookingHoldMs, getBookingSweepMs } from './booking.config';

describe('booking.config', () => {
  const saved = { ...process.env };

  beforeEach(() => {
    delete process.env.BOOKING_HOLD_MINUTES;
    delete process.env.BOOKING_SWEEP_SECONDS;
  });
  afterAll(() => {
    process.env = saved;
  });

  it('holds an unpaid booking for 3 minutes by default', () => {
    expect(getBookingHoldMs()).toBe(180_000);
  });

  it('reads BOOKING_HOLD_MINUTES', () => {
    process.env.BOOKING_HOLD_MINUTES = '10';
    expect(getBookingHoldMs()).toBe(600_000);
  });

  it('falls back to 3 minutes when the value is not a positive number', () => {
    process.env.BOOKING_HOLD_MINUTES = 'abc';
    expect(getBookingHoldMs()).toBe(180_000);
  });

  it('sweeps every 30 seconds by default', () => {
    expect(getBookingSweepMs()).toBe(30_000);
  });

  it('ignores sweep intervals below 5 seconds', () => {
    process.env.BOOKING_SWEEP_SECONDS = '1';
    expect(getBookingSweepMs()).toBe(30_000);
  });
});
