import { numericTransformer } from './numeric.transformer';

describe('numericTransformer', () => {
  it('converts a pg numeric string to a number', () => {
    expect(numericTransformer.from('2500.50')).toBe(2500.5);
  });

  it('maps null to 0', () => {
    expect(numericTransformer.from(null)).toBe(0);
  });

  it('passes numbers through when writing', () => {
    expect(numericTransformer.to(1200)).toBe(1200);
  });
});
