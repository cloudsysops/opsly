import type { MeteringEventPayload } from './types';

const MAX_FALLBACK = 500;
const queue: MeteringEventPayload[] = [];

/** Cola en memoria si Redis no está disponible (reconciliación / drain manual). */
export function pushMeteringFallback(event: MeteringEventPayload): void {
  queue.push(event);
  while (queue.length > MAX_FALLBACK) {
    queue.shift();
  }
}

/** Solo tests / operación: vacía la cola y devuelve copia. */
export function drainMeteringFallbackForTests(): MeteringEventPayload[] {
  const copy = [...queue];
  queue.length = 0;
  return copy;
}

export function meteringFallbackLengthForTests(): number {
  return queue.length;
}
