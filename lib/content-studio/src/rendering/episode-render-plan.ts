import type { Episode } from '../types.js';

/**
 * Dry-run render plan for a scripted episode. Does NOT call any render
 * provider, does NOT publish, does NOT incur cost — it only describes what
 * a future execution would need, so a human (or the gamer-worker-01 media
 * plane once wired) can review before anything runs.
 */
export interface EpisodeRenderPlan {
  episode_id: string;
  series_id: string;
  status: Episode['production']['status'];
  ready_to_render: boolean;
  blocking_reasons: string[];
  scenes: {
    number: number;
    duration_sec: number;
    assets_needed: string[];
  }[];
  total_duration_sec: number;
  assets_required: string[];
  suggested_pipeline: string[];
  notes: string[];
}

export function buildEpisodeRenderPlan(episode: Episode): EpisodeRenderPlan {
  const blockingReasons: string[] = [];

  if (episode.scenes.length === 0) {
    blockingReasons.push('No scenes defined — episode is still at idea stage.');
  }
  if (!['storyboard', 'assets', 'rendered', 'reviewed', 'published'].includes(episode.production.status)) {
    blockingReasons.push(
      `Episode production status is "${episode.production.status}" — needs storyboard approval before render.`
    );
  }

  const assetsRequired = Array.from(
    new Set(episode.scenes.flatMap((scene) => scene.assets_needed))
  );

  const totalDuration = episode.scenes.reduce((sum, scene) => sum + scene.duration_sec, 0);

  return {
    episode_id: episode.id,
    series_id: episode.series_id,
    status: episode.production.status,
    ready_to_render: blockingReasons.length === 0,
    blocking_reasons: blockingReasons,
    scenes: episode.scenes.map((scene) => ({
      number: scene.number,
      duration_sec: scene.duration_sec,
      assets_needed: scene.assets_needed,
    })),
    total_duration_sec: totalDuration,
    assets_required: assetsRequired,
    suggested_pipeline: [
      'voiceover (ElevenLabs, es+en)',
      'character visuals (DALL-E/Midjourney against Character Bible prompt)',
      'scene composition (FFmpeg / motion editor)',
      'subtitles (whisper.cpp local)',
      'human review',
      'manual publish (YouTube Studio) — no API auto-publish in Phase 1',
    ],
    notes: [
      'No render provider is called by this plan — output is informational only.',
      'Heavy compute (composition/upscale) can offload to gamer-worker-01 once its media worker allowlist includes a content-render task; see feat/pc-gamer-worker-plane.',
    ],
  };
}
