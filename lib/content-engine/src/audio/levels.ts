export interface AudioLevelPlan {
  voiceLevelDb: number;
  /** Music level while voiceover is present (ducked). */
  musicDuckedDb: number;
  /** Music level in scenes with no voiceover. */
  musicFullDb: number;
}

/**
 * Basic ducking: when a scene has voiceover, music drops by `duckAmountDb`
 * relative to the preset's configured music level. Not a dynamic
 * sidechain-compressor duck (that needs per-sample analysis) — a simple,
 * predictable static offset, which is enough for V1 narration-driven scenes.
 */
export function buildAudioLevelPlan(
  preset: { musicLevelDb: number; voiceLevelDb: number },
  duckAmountDb = 8
): AudioLevelPlan {
  return {
    voiceLevelDb: preset.voiceLevelDb,
    musicDuckedDb: preset.musicLevelDb - duckAmountDb,
    musicFullDb: preset.musicLevelDb,
  };
}
