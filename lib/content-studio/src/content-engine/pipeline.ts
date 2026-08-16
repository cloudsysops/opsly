import fs from 'node:fs';
import path from 'node:path';
import { createProjectEnvelope, saveProjectEnvelope, writeAssetFromSource, addProjectRenderJob, setProjectApproval, setProjectMetadata } from './storage.js';
import { discoverClips } from './clip-discovery.js';
import { evaluateRightsGate, scoreOriginalContribution } from './rights.js';
import { transcribeMedia, ownedFixtureTranscript, writeSidecarTranscript } from './transcribe.js';
import {
  captionBurn,
  extractClip,
  extractAudio,
  generateOwnedFixture,
  probeMedia,
  splitScreen,
  thumbnail,
  titleCard,
  verticalReframe,
  writeSrt,
} from './ffmpeg.js';
import { getContentProjectArtifactsRoot, getContentProjectWorkingRoot, getContentTenantAssetsRoot } from './paths.js';
import { buildContentMetadata } from './metadata.js';
import type {
  ClipCandidate,
  ContentMode,
  ContentProjectCreateInput,
  ContentProjectEnvelope,
  ContentProvenance,
} from './types.js';

function ownedProvenance(tenantId: string): ContentProvenance {
  return {
    owner: tenantId,
    creator: tenantId,
    license: 'all-rights-reserved',
    permissionType: 'owned',
    allowedPlatforms: ['youtube', 'instagram', 'tiktok'],
    usagePurpose: 'original-or-authorized-repurpose',
    attributionRequired: false,
    permissionEvidence: 'tenant-owned-fixture-or-upload',
  };
}

export async function ingestOwnedVideo(options: {
  tenantId: string;
  filePath: string;
  title?: string;
  mode?: ContentMode;
  baseDir?: string;
}): Promise<ContentProjectEnvelope> {
  const baseDir = options.baseDir ?? process.cwd();
  const input: ContentProjectCreateInput = {
    tenantId: options.tenantId,
    channel:
      options.tenantId === 'peskids' ||
      options.tenantId === 'bitsitos' ||
      options.tenantId === 'splashitos' ||
      options.tenantId === 'opsly-universe'
        ? options.tenantId
        : 'opsly-universe',
    series: 'creator-studio',
    title: options.title ?? path.basename(options.filePath, path.extname(options.filePath)),
    goal: 'education',
    audience: 'general',
    format: 'youtube_short',
    mode: options.mode ?? 'repurpose',
    portal: 'FUTURE',
    formatTemplate: options.mode === 'commentary' ? 'NOVA_REACTS' : 'NOVA_EXPLAINS',
    question: '¿Puede una IA reemplazar a un programador?',
  };
  let envelope = await createProjectEnvelope(input, baseDir);
  const probe = await probeMedia(options.filePath);
  const asset = await writeAssetFromSource({
    tenantId: options.tenantId,
    projectId: envelope.project.id,
    sourcePath: options.filePath,
    type: 'video',
    provenance: ownedProvenance(options.tenantId),
    metadata: { duration: probe.duration, width: probe.width, height: probe.height },
    baseDir,
  });
  envelope = {
    ...envelope,
    assets: [asset],
    project: { ...envelope.project, status: 'assets', updatedAt: new Date().toISOString() },
  };
  try {
    const audioOut = path.join(getContentTenantAssetsRoot(options.tenantId, baseDir), `${asset.id}.wav`);
    await extractAudio(options.filePath, audioOut);
  } catch {
    // Optional: some fixtures may not expose an audio graph the encoder likes.
  }
  await saveProjectEnvelope(envelope, baseDir);
  return envelope;
}

export async function transcribeProject(
  envelope: ContentProjectEnvelope,
  baseDir = process.cwd()
): Promise<ContentProjectEnvelope> {
  const source = envelope.assets[0];
  if (!source) {
    throw new Error('No source asset to transcribe');
  }
  const mediaPath = path.resolve(baseDir, source.path);
  const transcript = await transcribeMedia(mediaPath);
  const next = {
    ...envelope,
    transcript,
    project: { ...envelope.project, status: 'script' as const, updatedAt: new Date().toISOString() },
  };
  await saveProjectEnvelope(next, baseDir);
  return next;
}

export async function discoverProjectClips(
  envelope: ContentProjectEnvelope,
  baseDir = process.cwd()
): Promise<ContentProjectEnvelope> {
  if (!envelope.transcript) {
    throw new Error('Transcript required before clip discovery');
  }
  const clipCandidates = discoverClips(envelope.transcript, { limit: 5 });
  const next = {
    ...envelope,
    clipCandidates,
    project: { ...envelope.project, status: 'edit' as const, updatedAt: new Date().toISOString() },
  };
  await saveProjectEnvelope(next, baseDir);
  return next;
}

async function renderOneClip(
  envelope: ContentProjectEnvelope,
  clip: ClipCandidate,
  index: number,
  baseDir: string
): Promise<string> {
  const sourceAsset = envelope.assets[0];
  if (!sourceAsset) {
    throw new Error('No source asset to clip');
  }
  const source = path.resolve(baseDir, sourceAsset.path);
  const working = getContentProjectWorkingRoot(envelope.project.id, envelope.project.tenantId, baseDir);
  const artifacts = getContentProjectArtifactsRoot(envelope.project.id, baseDir);
  fs.mkdirSync(working, { recursive: true });
  fs.mkdirSync(artifacts, { recursive: true });
  const raw = path.join(working, `${clip.id}.mp4`);
  const vertical = path.join(working, `${clip.id}-9x16.mp4`);
  const captioned = path.join(artifacts, `repurpose-short-0${index}.mp4`);
  await extractClip(source, raw, clip.start, clip.duration);
  await verticalReframe(raw, vertical);
  await captionBurn(vertical, captioned, clip.hook);
  await writeSrt(path.join(artifacts, `${clip.id}.srt`), clip.hook, clip.duration);
  return captioned;
}

export async function renderTopClips(
  envelope: ContentProjectEnvelope,
  baseDir = process.cwd(),
  count = 3
): Promise<ContentProjectEnvelope> {
  const selected = (envelope.clipCandidates ?? []).slice(0, count);
  const outputs: string[] = [];
  for (const [index, clip] of selected.entries()) {
    const output = await renderOneClip(envelope, clip, index + 1, baseDir);
    outputs.push(output);
  }
  const artifacts = getContentProjectArtifactsRoot(envelope.project.id, baseDir);
  if (outputs[0]) {
    await thumbnail(outputs[0], path.join(artifacts, 'thumbnail.jpg'));
  }
  const job = {
    id: `render-${Date.now()}`,
    projectId: envelope.project.id,
    status: 'completed' as const,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    outputPath: outputs[0],
    logs: outputs,
  };
  let next = addProjectRenderJob(envelope, job);
  next = setProjectMetadata(next, buildContentMetadata(next));
  next = {
    ...next,
    project: { ...next.project, status: 'qa', updatedAt: new Date().toISOString() },
  };
  await saveProjectEnvelope(next, baseDir);
  return next;
}

export async function rightsAndQueueApproval(
  envelope: ContentProjectEnvelope,
  baseDir = process.cwd()
): Promise<ContentProjectEnvelope> {
  const contribution = scoreOriginalContribution({
    sourceDuration: Number(envelope.assets[0]?.metadata.duration ?? 48),
    originalDuration: 24,
    originalNarrationDuration: 18,
    numberOfInterruptions: envelope.project.mode === 'commentary' ? 4 : 0,
    researchSections: envelope.research?.length ?? 1,
    originalVisualSections: 2,
    experimentSections: envelope.project.mode === 'commentary' ? 1 : 0,
    conclusionPresent: true,
  });
  const withScore = { ...envelope, contribution };
  const rights = evaluateRightsGate(withScore);
  const queued = setProjectApproval(
    { ...withScore, rights, project: { ...withScore.project, status: 'rights_review' } },
    { state: 'ready_for_review', reviewNotes: `Rights ${rights.verdict}` }
  );
  await saveProjectEnvelope(queued, baseDir);
  return queued;
}

export async function runRepurposeSlice(options: {
  tenantId: string;
  filePath?: string;
  baseDir?: string;
}): Promise<ContentProjectEnvelope> {
  const baseDir = options.baseDir ?? process.cwd();
  const artifactsRoot = getContentProjectArtifactsRoot('tmp', baseDir);
  const fixturePath = options.filePath ?? path.join(path.dirname(artifactsRoot), 'fixtures', 'owned-long.mp4');
  if (!options.filePath) {
    fs.mkdirSync(path.dirname(fixturePath), { recursive: true });
    await generateOwnedFixture(fixturePath, 48);
    writeSidecarTranscript(fixturePath, ownedFixtureTranscript());
  }
  let envelope = await ingestOwnedVideo({
    tenantId: options.tenantId,
    filePath: fixturePath,
    title: 'NØVA Explains IA y programadores',
    mode: 'repurpose',
    baseDir,
  });
  envelope = await transcribeProject(envelope, baseDir);
  envelope = await discoverProjectClips(envelope, baseDir);
  envelope = await renderTopClips(envelope, baseDir, 3);
  envelope = await rightsAndQueueApproval(envelope, baseDir);
  const artifacts = getContentProjectArtifactsRoot(envelope.project.id, baseDir);
  fs.writeFileSync(path.join(artifacts, 'metadata.json'), `${JSON.stringify(envelope.metadata, null, 2)}\n`);
  fs.writeFileSync(path.join(artifacts, 'captions.srt'), (envelope.clipCandidates ?? []).map((clip, i) => `${i + 1}\n00:00:00,000 --> 00:00:08,000\n${clip.hook}\n`).join('\n'));
  return envelope;
}

export async function runOriginalNovaExplains(baseDir = process.cwd()): Promise<ContentProjectEnvelope> {
  const input: ContentProjectCreateInput = {
    tenantId: 'opsly-universe',
    channel: 'opsly-universe',
    series: 'nova-explains',
    title: '¿Puede una IA reemplazar a un programador?',
    goal: 'education',
    audience: 'builders',
    format: 'youtube_short',
    mode: 'original',
    portal: 'FUTURE',
    formatTemplate: 'NOVA_EXPLAINS',
    question: '¿Puede una IA reemplazar a un programador?',
  };
  let envelope = await createProjectEnvelope(input, baseDir);
  const artifacts = getContentProjectArtifactsRoot(envelope.project.id, baseDir);
  const working = getContentProjectWorkingRoot(envelope.project.id, envelope.project.tenantId, baseDir);
  fs.mkdirSync(working, { recursive: true });
  fs.mkdirSync(artifacts, { recursive: true });
  const beats = [
    { beat: 'WOW' as const, text: 'Una IA escribio codigo en 12 segundos' },
    { beat: 'WHY' as const, text: '¿Puede reemplazar a un programador?' },
    { beat: 'EXPLORE' as const, text: 'NØVA entra al portal FUTURE' },
    { beat: 'UNDERSTAND' as const, text: 'Programar es criterio, no solo texto' },
    { beat: 'HUMAN' as const, text: 'Alguien sigue siendo responsable' },
    { beat: 'TAKEAWAY' as const, text: 'La IA acelera. El juicio permanece.' },
  ];
  envelope = {
    ...envelope,
    scenes: beats.map((item, index) => ({
      id: `scene-${index + 1}`,
      projectId: envelope.project.id,
      order: index + 1,
      durationMs: 3000,
      visualType: 'title_card',
      assetRefs: [],
      caption: item.text,
      transition: 'cut',
      motion: 'static',
      editorialBeat: item.beat,
    })),
    project: { ...envelope.project, status: 'storyboard' },
  };
  const cards: string[] = [];
  for (const [index, item] of beats.entries()) {
    const card = path.join(working, `card-${index + 1}.mp4`);
    await titleCard(card, item.text, 3);
    cards.push(card);
  }
  const output = path.join(artifacts, 'original-short.mp4');
  const { concatVideos } = await import('./ffmpeg.js');
  await concatVideos(cards, output);
  envelope = addProjectRenderJob(envelope, {
    id: `original-${Date.now()}`,
    projectId: envelope.project.id,
    status: 'completed',
    outputPath: output,
    logs: [output],
    completedAt: new Date().toISOString(),
  });
  envelope = {
    ...envelope,
    assets: [
      {
        id: `${envelope.project.id}-original`,
        tenantId: envelope.project.tenantId,
        projectId: envelope.project.id,
        type: 'video',
        path: path.relative(baseDir, output),
        source: output,
        license: 'all-rights-reserved',
        checksum: 'owned-original',
        metadata: { generated: true },
        provenance: ownedProvenance(envelope.project.tenantId),
      },
    ],
  };
  await thumbnail(output, path.join(artifacts, 'thumbnail.jpg'));
  envelope = setProjectMetadata(envelope, buildContentMetadata(envelope));
  fs.writeFileSync(path.join(artifacts, 'metadata.json'), `${JSON.stringify(envelope.metadata, null, 2)}\n`);
  envelope = await rightsAndQueueApproval(envelope, baseDir);
  await saveProjectEnvelope(envelope, baseDir);
  return envelope;
}

export async function runCommentaryDemo(baseDir = process.cwd()): Promise<ContentProjectEnvelope> {
  const fixture = path.join(getContentProjectArtifactsRoot('fixtures', baseDir), 'commentary-source.mp4');
  fs.mkdirSync(path.dirname(fixture), { recursive: true });
  await generateOwnedFixture(fixture, 12);
  writeSidecarTranscript(fixture, ownedFixtureTranscript());
  let envelope = await ingestOwnedVideo({
    tenantId: 'opsly-universe',
    filePath: fixture,
    title: 'NØVA Reacts: AI will replace every programmer',
    mode: 'commentary',
    baseDir,
  });
  const working = getContentProjectWorkingRoot(envelope.project.id, envelope.project.tenantId, baseDir);
  const artifacts = getContentProjectArtifactsRoot(envelope.project.id, baseDir);
  const novaCard = path.join(working, 'nova-question.mp4');
  await titleCard(novaCard, 'NØVA: ¿Todos?', 8, '0x3B0764');
  const output = path.join(artifacts, 'commentary-demo.mp4');
  await splitScreen(fixture, novaCard, output);
  envelope = {
    ...envelope,
    contribution: scoreOriginalContribution({
      sourceDuration: 12,
      originalDuration: 8,
      originalNarrationDuration: 8,
      numberOfInterruptions: 3,
      researchSections: 1,
      originalVisualSections: 1,
      experimentSections: 1,
      conclusionPresent: true,
    }),
    research: ['Definir el claim', 'Experimento humano vs agente'],
  };
  envelope = addProjectRenderJob(envelope, {
    id: `commentary-${Date.now()}`,
    projectId: envelope.project.id,
    status: 'completed',
    outputPath: output,
    logs: [output],
    completedAt: new Date().toISOString(),
  });
  envelope = await rightsAndQueueApproval(envelope, baseDir);
  await saveProjectEnvelope(envelope, baseDir);
  return envelope;
}

export function copyEvidenceBundle(files: Record<string, string>, destDir: string): string[] {
  fs.mkdirSync(destDir, { recursive: true });
  const copied: string[] = [];
  for (const [name, src] of Object.entries(files)) {
    if (!src || !fs.existsSync(src)) continue;
    const dest = path.join(destDir, name);
    fs.copyFileSync(src, dest);
    copied.push(dest);
  }
  return copied;
}
