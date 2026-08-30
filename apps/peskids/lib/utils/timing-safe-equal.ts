/**
 * Constant-time string comparison for secrets/tokens (admin bypass tokens, webhook
 * shared secrets, cron secrets). Plain-JS XOR comparison (no Node `crypto` import) so
 * it works identically in the Node runtime and in Next.js Edge Runtime (middleware.ts).
 *
 * `===` short-circuits on the first differing byte, which can leak timing information
 * about how many leading characters of a guessed secret are correct.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

/** True if `value` constant-time-equals any entry in `candidates`. */
export function timingSafeIncludes(candidates: readonly string[], value: string): boolean {
  let matched = false
  for (const candidate of candidates) {
    if (timingSafeEqual(candidate, value)) {
      matched = true
    }
  }
  return matched
}
