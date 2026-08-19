/** Integer minor-unit money. Never use IEEE floats for royalty math. */

export class MoneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MoneyError';
  }
}

export function assertMinor(amount: number, label: string): number {
  if (!Number.isInteger(amount) || amount < 0) {
    throw new MoneyError(`${label} must be a non-negative integer minor unit`);
  }
  if (!Number.isSafeInteger(amount)) {
    throw new MoneyError(`${label} exceeds safe integer range`);
  }
  return amount;
}

export function assertBps(bps: number): number {
  if (!Number.isInteger(bps) || bps < 0 || bps > 100_000) {
    throw new MoneyError('percentageBps must be an integer between 0 and 100000 (0–1000%)');
  }
  return bps;
}

/**
 * (baseMinor * bps) / 10000 with half-up rounding to the nearest minor unit.
 * Uses BigInt so large COP/USD amounts stay reproducible.
 */
export function applyBpsHalfUp(baseMinor: number, bps: number): number {
  assertMinor(baseMinor, 'base');
  assertBps(bps);
  const n = BigInt(baseMinor) * BigInt(bps);
  const div = 10000n;
  const q = n / div;
  const r = n % div;
  const rounded = r * 2n >= div ? q + 1n : q;
  const result = Number(rounded);
  if (!Number.isSafeInteger(result)) {
    throw new MoneyError('royalty result exceeds safe integer range');
  }
  return result;
}
