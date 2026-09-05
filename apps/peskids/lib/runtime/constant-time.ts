/**
 * Runtime-agnostic constant-time string comparison.
 *
 * Deliberately does NOT use `node:crypto` — this module is imported by
 * middleware.ts, which runs on the Edge runtime where `node:crypto` and
 * `Buffer` are unavailable. Pulling the Node build in there is a build failure,
 * so the comparison is implemented over char codes instead.
 *
 * Like `crypto.timingSafeEqual`, this leaks the *length* of the secret (an
 * early return on mismatched length), which is not sensitive here; what it does
 * not leak is how many leading characters matched, which `===` does.
 */
export function constantTimeEquals(provided: string, expected: string): boolean {
  if (typeof provided !== 'string' || typeof expected !== 'string') return false;
  if (provided.length !== expected.length) return false;

  let diff = 0;
  for (let i = 0; i < provided.length; i += 1) {
    diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}
