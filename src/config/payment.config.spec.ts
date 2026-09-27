import { join } from 'path';
import { ALLOWED_SLIP_MIME, getPaymentConfig } from './payment.config';

describe('payment.config', () => {
  const saved = { ...process.env };

  beforeEach(() => {
    delete process.env.UPLOAD_DIR;
    delete process.env.PAYMENT_ACCOUNT_NAME;
    delete process.env.PAYMENT_MAX_SLIP_BYTES;
  });
  afterAll(() => {
    process.env = saved;
  });

  it('uses safe defaults when the environment is empty', () => {
    const cfg = getPaymentConfig();
    expect(cfg.accountName).toBe('Poonsuk Resort');
    expect(cfg.maxSlipBytes).toBe(5 * 1024 * 1024);
    expect(cfg.slipDir).toBe(join(cfg.uploadDir, 'slips'));
  });

  it('keeps an absolute UPLOAD_DIR as-is', () => {
    process.env.UPLOAD_DIR = '/data/uploads';
    expect(getPaymentConfig().uploadDir).toBe('/data/uploads');
  });

  it('resolves a relative UPLOAD_DIR against the working directory', () => {
    process.env.UPLOAD_DIR = 'files';
    expect(getPaymentConfig().uploadDir).toBe(join(process.cwd(), 'files'));
  });

  it('only accepts image slips', () => {
    expect(ALLOWED_SLIP_MIME['image/png']).toBe('png');
    expect(ALLOWED_SLIP_MIME['application/pdf']).toBeUndefined();
  });
});
