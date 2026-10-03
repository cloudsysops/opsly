// Pure allowlist/alias logic for oad — zero imports, zero side effects, so
// it can be unit tested without OBS, a tenant config, or STREAM_KIT_DATA_DIR.
// See oad.mjs for the part that actually talks to OBS.

export const ALIASES = {
  gaming: 'juego',
  coding: 'coding',
  factory: null, // no OBS scene shows Mission Control Dev yet — stays unmapped, not guessed
  intermission: 'brb',
  starting: 'inicio',
};

export const EXIT_OK = 0;
export const EXIT_UNKNOWN_SCENE = 2;
export const EXIT_SCENE_NOT_CONFIGURED = 3;
export const EXIT_OBS_UNREACHABLE = 4;
export const EXIT_PHYSICAL_SCENE_MISSING = 5;
export const EXIT_READBACK_MISMATCH = 6;

/** Resolves a CLI word to its tenant scene key. Throws RangeError on
 * anything outside the allowlist — never touches OBS. */
export function resolveAlias(word) {
  const key = String(word ?? '').trim().toLowerCase();
  if (!Object.prototype.hasOwnProperty.call(ALIASES, key)) {
    throw new RangeError(`unknown scene alias: ${word}`);
  }
  return { logical: key, tenantKey: ALIASES[key] };
}
