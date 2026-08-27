import { UniverseBitSchema } from '../schemas.js';
import type { UniverseBit } from '../types.js';
import { dewthread } from './dewthread.js';

export const CANONICAL_BITS: UniverseBit[] = [UniverseBitSchema.parse(dewthread)];
