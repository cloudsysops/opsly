#!/usr/bin/env tsx
/**
 * One-off authoring script for the pilot episode: opsly-parallel-path-pilot-001.
 *
 * Scene copy for beats 1-5 is taken verbatim (ES) from the canonical script
 * at data/content/series/opsly-parallel-path/episodes/001-the-question/script.md
 * ("La Pregunta" / "The Question", S1E01 of OPSLY: The Parallel Path) —
 * that canon was authored independently in PR #961 and pulled into this
 * branch to reconcile with it rather than duplicate invented dialogue.
 * Beats 6-8 (the infra/products montage, the Parallel World reveal, and the
 * map scene) extend beyond what canon's episode 001 covers on its own —
 * canon's own script.md notes it deliberately "stays grounded" and defers
 * the first Parallel World reveal to Episode 3. This pilot is a condensed,
 * render-pipeline proof-of-concept cut across that arc, not a claim to be
 * the canonical serialized episode 001 cut (that id, opsly-parallel-path-001,
 * belongs to canon's own episode.json).
 *
 * No real character art exists in this repo for The Traveler/NØVA (canon's
 * own episode.json scenes list "character sheet: the-traveler" /
 * "character sheet: nova" under assets_needed, and production.status is
 * still "storyboard") — visuals here are honestly-labeled placeholder
 * stills (solid color + scene description text), generated locally via
 * ffmpeg. Dialogue is delivered as burned captions (no TTS/manual voice
 * files were supplied for this pilot), which content-engine explicitly
 * supports as a V1 path.
 *
 * Re-running this script is idempotent: it overwrites the same project id.
 */
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  generatePlaceholderStill,
  getChannelPreset,
  registerAsset,
  saveAssets,
  saveProject,
  saveScenes,
  tenantAssetsDir,
  transitionProjectStatus,
  type Asset,
  type ContentProject,
  type Scene,
} from '@intcloudsysops/content-engine';

const TENANT = 'intcloudsysops';
const PROJECT_ID = 'opsly-parallel-path-pilot-001';
const CHANNEL = 'opsly-universe';

interface SceneSeed {
  order: number;
  durationMs: number;
  visualLabel: string;
  caption?: string;
  motion: Scene['motion'];
}

const SCENES: SceneSeed[] = [
  {
    order: 1,
    durationMs: 5000,
    visualLabel: 'Habitacion oscura.\nThe Traveler frente a una laptop.',
    caption: '2025. Una laptop, muchas ideas, casi ningún recurso.',
    motion: 'zoom-in',
  },
  {
    order: 2,
    durationMs: 5000,
    visualLabel: 'Pantalla con conversacion\nabstracta de IA.',
    caption: '¿Y si pudiera construir algo mío?',
    motion: 'static',
  },
  {
    order: 3,
    durationMs: 4000,
    visualLabel: 'Lineas de codigo\ny geometria.',
    caption: 'La conversación comienza. No hay respuesta todavía — solo preguntas.',
    motion: 'pan-right',
  },
  {
    order: 4,
    durationMs: 3500,
    visualLabel: 'Una pequeña luz azul\nse forma.',
    caption: 'Un pequeño punto azul aparece dentro del computador.',
    motion: 'zoom-in',
  },
  {
    order: 5,
    durationMs: 4000,
    visualLabel: 'NØVA abre los ojos.',
    caption: 'NØVA abre los ojos por primera vez.',
    motion: 'zoom-out',
  },
  {
    order: 6,
    durationMs: 6000,
    visualLabel: 'Infraestructura · Construccion\nServidores · Viajes\nPeskids · Agentes',
    motion: 'pan-left',
  },
  {
    order: 7,
    durationMs: 5000,
    visualLabel: 'NØVA observa\nel Parallel World.',
    motion: 'zoom-in',
  },
  {
    order: 8,
    durationMs: 7500,
    visualLabel: 'The Traveler y NØVA\nfrente al mapa.',
    caption: 'Pensé que estaba perdido. Después entendí que estaba construyendo el mapa. — OPSLY: THE PARALLEL PATH',
    motion: 'zoom-out',
  },
];

async function main(): Promise<void> {
  const preset = getChannelPreset(CHANNEL);
  const now = new Date().toISOString();

  const project: ContentProject = {
    id: PROJECT_ID,
    tenantId: TENANT,
    channel: CHANNEL,
    series: 'OPSLY: The Parallel Path',
    episode: 1,
    title: 'Todo empezó con una pregunta',
    slug: 'todo-empezo-con-una-pregunta',
    goal:
      'Introduce The Traveler and NØVA — condensed render-pipeline pilot cut across ' +
      'the arc canon\'s data/content/series/opsly-parallel-path/episodes/001-the-question/ ' +
      '("La Pregunta") begins and episodes 3+ continue (Parallel World reveal, the map).',
    audience: 'OPSLY Universe followers',
    format: preset.aspectRatio,
    status: 'idea',
    preset: CHANNEL,
    createdAt: now,
    updatedAt: now,
  };

  const assetsDir = join(tenantAssetsDir(TENANT), PROJECT_ID);
  mkdirSync(assetsDir, { recursive: true });

  const scenes: Scene[] = [];
  const assets: Asset[] = [];
  const palette = [preset.brandColors.primary, preset.brandColors.secondary];

  for (const seed of SCENES) {
    const relativePath = join(PROJECT_ID, `scene-${String(seed.order).padStart(2, '0')}.png`);
    const absolutePath = join(tenantAssetsDir(TENANT), relativePath);
    const bgColor = palette[seed.order % palette.length];

    if (!existsSync(absolutePath)) {
      await generatePlaceholderStill(absolutePath, {
        width: preset.resolution.width,
        height: preset.resolution.height,
        backgroundColor: bgColor,
        text: `SCENE ${seed.order}\n\n${seed.visualLabel}`,
        fontSize: 56,
        fontColor: preset.brandColors.accent,
      });
    }

    const asset = registerAsset({
      tenantId: TENANT,
      projectId: PROJECT_ID,
      type: 'image',
      relativePath,
      source: 'placeholder',
      license: 'internal-placeholder',
      metadata: {
        note:
          'Honest placeholder — canon (data/content/characters/the-traveler.json, nova.json) ' +
          'has full generation_prompt/negative_prompt specs, but no character-sheet art has ' +
          'been generated yet (canon episode.json production.status is still "storyboard").',
      },
    });
    assets.push(asset);

    scenes.push({
      id: `scene_${String(seed.order).padStart(2, '0')}`,
      projectId: PROJECT_ID,
      order: seed.order,
      durationMs: seed.durationMs,
      visualType: 'image',
      assetRefs: [asset.id],
      caption: seed.caption,
      transition: 'cut',
      motion: seed.motion,
    });
  }

  saveProject(project);
  saveScenes(TENANT, PROJECT_ID, scenes);
  saveAssets(TENANT, PROJECT_ID, assets);

  // Walk the real status lifecycle now that scenes+assets are actually in
  // place — not a shortcut, this is the same transition function
  // content:render itself relies on being enforced.
  let current = project;
  for (const next of ['drafting', 'assets_pending', 'ready_to_render'] as const) {
    current = transitionProjectStatus(current, next);
  }

  const totalSec = scenes.reduce((sum, s) => sum + s.durationMs, 0) / 1000;
  console.log(`✅ Seeded pilot project: ${PROJECT_ID}`);
  console.log(`   ${scenes.length} scenes, ${totalSec.toFixed(1)}s total`);
  console.log(`   Visuals: ${assets.length} placeholder stills (no real character art exists yet)`);
}

main().catch((error) => {
  console.error(`content-seed-opsly-origins: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
