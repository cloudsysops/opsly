#!/usr/bin/env tsx
/**
 * ICSO Content Engine CLI — local-first structured video pipeline.
 *
 * Usage:
 *   npm run content:list [-- --tenant <slug>]
 *   npm run content:create -- --tenant <slug> --channel <bitsitos|splashitos|opsly-universe> --series <slug> --title "<title>" [--episode N]
 *   npm run content:validate -- <projectId>
 *   npm run content:render-plan -- <projectId>
 *   npm run content:render -- <projectId>
 *   npm run content:thumbnail -- <projectId> [--at <seconds>]
 *   npm run content:metadata -- <projectId>
 *   npm run content -- --help
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  buildProjectId,
  buildRenderPlan,
  buildYouTubeMetadata,
  composeProject,
  finalVideoPath,
  formatRenderPlan,
  formatValidationResult,
  generateThumbnailFromVideo,
  getChannelPreset,
  isFfmpegAvailable,
  isFfprobeAvailable,
  listChannels,
  listProjects,
  loadAssets,
  loadProject,
  loadScenes,
  markReadyForReview,
  metadataPath,
  saveProject,
  saveScenes,
  slugify,
  thumbnailPath,
  transitionProjectStatus,
  validateProject,
  type ContentChannel,
  type ContentProject,
} from '@intcloudsysops/content-engine';

const PROG = 'content-cli';

function parseFlags(argv: string[]): { positional: string[]; flags: Record<string, string> } {
  const positional: string[] = [];
  const flags: Record<string, string> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const name = arg.slice(2);
      const value = argv[i + 1];
      if (value === undefined || value.startsWith('--')) {
        flags[name] = 'true';
      } else {
        flags[name] = value;
        i += 1;
      }
    } else {
      positional.push(arg);
    }
  }
  return { positional, flags };
}

function printHelp(): void {
  console.log(`${PROG} — ICSO Content Engine

Commands:
  list [--tenant <slug>]
  create --tenant <slug> --channel <channel> --series <slug> --title "<title>" [--episode N]
  validate <projectId>
  render-plan <projectId>
  render <projectId>
  thumbnail <projectId> [--at <seconds>]
  metadata <projectId>

Channels: ${listChannels().join(', ')}
`);
}

async function cmdList(flags: Record<string, string>): Promise<void> {
  const projects = listProjects(flags.tenant);
  if (projects.length === 0) {
    console.log('No content projects found.');
    return;
  }
  for (const p of projects) {
    console.log(`${p.id}\t${p.tenantId}\t${p.channel}\t${p.status}\t"${p.title}"`);
  }
}

async function cmdCreate(flags: Record<string, string>): Promise<void> {
  const tenant = flags.tenant;
  const channel = flags.channel as ContentChannel | undefined;
  const series = flags.series;
  const title = flags.title;
  const episode = flags.episode ? Number(flags.episode) : 1;

  if (!tenant || !channel || !series || !title) {
    console.error(`${PROG}: create requires --tenant, --channel, --series, --title`);
    process.exitCode = 1;
    return;
  }
  if (!listChannels().includes(channel)) {
    console.error(`${PROG}: unknown channel "${channel}" (expected one of: ${listChannels().join(', ')})`);
    process.exitCode = 1;
    return;
  }

  const seriesSlug = slugify(series);
  const existing = listProjects(tenant).filter((p) => p.id.startsWith(`${seriesSlug}-`));
  const nextSequence = existing.length + 1;
  const id = buildProjectId(seriesSlug, nextSequence);
  const now = new Date().toISOString();

  const project: ContentProject = {
    id,
    tenantId: tenant,
    channel,
    series,
    episode,
    title,
    slug: slugify(title),
    goal: '',
    audience: '',
    format: getChannelPreset(channel).aspectRatio,
    status: 'idea',
    preset: channel,
    createdAt: now,
    updatedAt: now,
  };
  saveProject(project);
  saveScenes(tenant, id, []);

  console.log(`✅ Created content project: ${id}`);
  console.log(`   tenant: ${tenant}  channel: ${channel}  series: ${series}`);
  console.log(`   Next: add scenes to data/content/tenants/${tenant}/projects/${id}/scenes.json, then npm run content:validate -- ${id}`);
}

async function cmdValidate(projectId: string): Promise<void> {
  const project = loadProject(projectId);
  const scenes = loadScenes(project.tenantId, projectId);
  const assets = loadAssets(project.tenantId, projectId);
  const result = validateProject(project, scenes, assets);
  console.log(formatValidationResult(result));
  if (!result.valid) process.exitCode = 1;
}

async function cmdRenderPlan(projectId: string): Promise<void> {
  const project = loadProject(projectId);
  const scenes = loadScenes(project.tenantId, projectId);
  const assets = loadAssets(project.tenantId, projectId);
  const preset = getChannelPreset(project.channel);
  const plan = buildRenderPlan(project, scenes, assets, preset, finalVideoPath(projectId));
  console.log(formatRenderPlan(plan));
}

async function cmdRender(projectId: string): Promise<void> {
  if (!isFfmpegAvailable() || !isFfprobeAvailable()) {
    console.error('BLOCKED_RENDER');
    console.error(
      `${PROG}: ffmpeg/ffprobe not found on PATH. Install ffmpeg (e.g. \`apt-get install -y ffmpeg\`) and retry.`
    );
    process.exitCode = 1;
    return;
  }

  const project = loadProject(projectId);
  const scenes = loadScenes(project.tenantId, projectId);
  const assets = loadAssets(project.tenantId, projectId);
  const result = validateProject(project, scenes, assets);
  if (!result.valid) {
    console.error('BLOCKED_RENDER');
    console.error(`${PROG}: project "${projectId}" failed validation — run content:validate for details.`);
    console.log(formatValidationResult(result));
    process.exitCode = 1;
    return;
  }

  const preset = getChannelPreset(project.channel);
  const musicAsset = assets.find((a) => a.type === 'music');

  const rendering = transitionProjectStatus(project, 'rendering');
  console.log(`🎬 Rendering ${projectId} (${scenes.length} scenes, ${preset.label})...`);

  try {
    const composeResult = await composeProject(rendering, scenes, assets, preset, musicAsset?.id);
    markReadyForReview(rendering);
    console.log(`✅ Rendered: ${composeResult.outputPath}`);
    console.log(`   captions: ${composeResult.captionsPath}`);
    console.log(`   duration: ${(composeResult.durationMs / 1000).toFixed(1)}s`);
  } catch (error) {
    transitionProjectStatus(rendering, 'failed');
    console.error('BLOCKED_RENDER');
    console.error(`${PROG}: render failed — ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

async function cmdThumbnail(projectId: string, flags: Record<string, string>): Promise<void> {
  if (!isFfmpegAvailable()) {
    console.error('BLOCKED_RENDER');
    console.error(`${PROG}: ffmpeg not found on PATH.`);
    process.exitCode = 1;
    return;
  }
  const project = loadProject(projectId);
  const preset = getChannelPreset(project.channel);
  const videoPath = finalVideoPath(projectId);
  const outputPath = thumbnailPath(projectId);
  const atSec = flags.at ? Number(flags.at) : 1;

  try {
    await generateThumbnailFromVideo({ videoPath, outputPath, title: project.title, preset, atSec });
    console.log(`✅ Thumbnail: ${outputPath}`);
  } catch (error) {
    console.error(`${PROG}: thumbnail generation failed — ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

async function cmdMetadata(projectId: string): Promise<void> {
  const project = loadProject(projectId);
  const metadata = buildYouTubeMetadata(project);
  const path = metadataPath(projectId);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(metadata, null, 2) + '\n', 'utf8');
  console.log(`✅ Metadata: ${path}`);
  console.log(JSON.stringify(metadata, null, 2));
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const [command, ...rest] = argv;

  if (!command || command === '--help' || command === '-h') {
    printHelp();
    return;
  }

  const { positional, flags } = parseFlags(rest);

  switch (command) {
    case 'list':
      await cmdList(flags);
      break;
    case 'create':
      await cmdCreate(flags);
      break;
    case 'validate':
      if (!positional[0]) return void console.error(`${PROG}: validate requires <projectId>`);
      await cmdValidate(positional[0]);
      break;
    case 'render-plan':
      if (!positional[0]) return void console.error(`${PROG}: render-plan requires <projectId>`);
      await cmdRenderPlan(positional[0]);
      break;
    case 'render':
      if (!positional[0]) return void console.error(`${PROG}: render requires <projectId>`);
      await cmdRender(positional[0]);
      break;
    case 'thumbnail':
      if (!positional[0]) return void console.error(`${PROG}: thumbnail requires <projectId>`);
      await cmdThumbnail(positional[0], flags);
      break;
    case 'metadata':
      if (!positional[0]) return void console.error(`${PROG}: metadata requires <projectId>`);
      await cmdMetadata(positional[0]);
      break;
    default:
      console.error(`${PROG}: unknown command "${command}"`);
      printHelp();
      process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`${PROG}: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
