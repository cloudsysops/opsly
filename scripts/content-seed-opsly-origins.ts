#!/usr/bin/env tsx
/**
 * One-off authoring script for the required pilot episode: opsly-origins-001.
 *
 * No real character art exists in this repo (confirmed by repo search before
 * writing this script) — visuals are honestly-labeled placeholder stills
 * (solid color + scene description text), generated locally via ffmpeg.
 * Dialogue is delivered as burned captions (no TTS/manual voice files were
 * supplied for this pilot), which content-engine explicitly supports as a
 * V1 path ("funciona aunque inicialmente algunos assets sean suministrados
 * manualmente" / "V1 debe funcionar incluso usando únicamente imágenes").
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
const PROJECT_ID = 'opsly-origins-001';
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
    caption: 'Todo empezó con una pregunta.',
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
    motion: 'pan-right',
  },
  {
    order: 4,
    durationMs: 3500,
    visualLabel: 'Una pequeña luz azul\nse forma.',
    motion: 'zoom-in',
  },
  {
    order: 5,
    durationMs: 4000,
    visualLabel: 'NØVA abre los ojos.',
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
    caption: 'Pensé que estaba perdido. ... Estaba construyendo el mapa. OPSLY',
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
    goal: 'Introduce The Traveler and NØVA — the origin of the Parallel Path.',
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
      metadata: { note: 'Honest placeholder — no generated character art exists yet for this saga.' },
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
