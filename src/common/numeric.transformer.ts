import { ValueTransformer } from 'typeorm';

/**
 * `numeric` comes back from pg as a string to protect precision. Money in this
 * app never exceeds JS integer-safe range, so converting to number at the edge
 * keeps the JSON contract identical to the Flutter `double` fields.
 */
export const numericTransformer: ValueTransformer = {
  to: (value: number): number => value,
  from: (value: string | null): number => (value === null ? 0 : Number(value)),
};
