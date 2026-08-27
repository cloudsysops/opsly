import { UniverseUnknownBitError } from '../errors.js';
import { UniverseBitSchema } from '../schemas.js';
import type { UniverseBit } from '../types.js';
import { normalizeRef } from '../registry.js';
import { CANONICAL_BITS } from './index.js';

const bits = CANONICAL_BITS.map((bit) => UniverseBitSchema.parse(bit));
const byId = new Map(bits.map((bit) => [bit.id, bit]));
const bySlug = new Map(bits.map((bit) => [bit.slug, bit]));

export function getBit(ref: string): UniverseBit {
  const key = normalizeRef(ref);
  const found = byId.get(key) ?? bySlug.get(key);
  if (!found) {
    throw new UniverseUnknownBitError(ref);
  }
  return found;
}

export function listBits(): UniverseBit[] {
  return [...bits];
}

export function getBitsForWorld(worldId: string): UniverseBit[] {
  return bits.filter((bit) => bit.world === worldId);
}

export function bitCardFromBit(bit: UniverseBit): UniverseBit['cardRepresentation'] {
  return { ...bit.cardRepresentation };
}
