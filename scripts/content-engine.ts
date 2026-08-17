import fs from 'node:fs/promises';
import path from 'node:path';
import {
  buildProjectId,
  buildRenderPlan,
  buildContentMetadata,
  createProjectEnvelope,
  createProjectFromStory,
  findProjectEnvelope,
  listProjectEnvelopes,
  loadProjectEnvelopeByTenant,
  saveProjectEnvelope,
  setProjectApproval,
  setProjectMetadata,
  validateContentProject,
  renderProject,
  loadContentChannelPreset,
} from '../lib/content-studio/src/index.ts';
import type {
  ContentChannel,
  ContentFormat,
  ContentGoal,
  ContentProjectCreateInput,
  ContentProjectEnvelope,
} from '../lib/content-studio/src/index.ts';

type CliFlags = Record<string, string | boolean | string[]>;

function printHelp(): void {
  console.log(`Opsly Content Engine

Usage:
  npm run content -- <command> [options]

Commands:
  list
  create --tenant <tenant> --channel <bitsitos|splashitos|opsly-universe> --series <series> --title <title> [--goal education] [--audience ...] [--format youtube_short] [--episode ...] [--preset ...] [--story <file.json>]
  validate <projectId>
  render-plan <projectId>
  render <projectId>
  thumbnail <projectId>
  metadata <projectId>
  approve <projectId> --by <name> [--notes <text>]
  reject <projectId> [--notes <text>]

Story file format:
  {
    "project": { "tenantId": "...", "channel": "...", "series": "...", "title": "...", "goal": "...", "audience": "...", "format": "youtube_short" },
    "assets": [{ "key": "scene-1-image", "sourcePath": "./image.jpg", "type": "image" }],
    "scenes": [{ "id": "scene-1", "order": 1, "durationMs": 2500, "visualType": "image", "assetRefs": ["scene-1-image"], "voiceover": "...", "caption": "...", "transition": "cut", "motion": "zoom-in" }]
  }
`);
}

function parseFlags(argv: string[]): { command: string; positionals: string[]; flags: CliFlags } {
  const positionals: string[] = [];
  const flags: CliFlags = {};
  let command = '';

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      flags.help = true;
      continue;
    }
    if (!command && !arg.startsWith('--')) {
      command = arg;
      continue;
    }
    if (arg.startsWith('--')) {
      const [name, inline] = arg.slice(2).split('=');
      if (inline !== undefined) {
        const current = flags[name];
        if (current === undefined) {
          flags[name] = inline;
        } else if (Array.isArray(current)) {
          current.push(inline);
        } else {
          flags[name] = [String(current), inline];
        }
        continue;
      }
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) {
        flags[name] = true;
        continue;
      }
      i += 1;
      const current = flags[name];
      if (current === undefined) {
        flags[name] = next;
      } else if (Array.isArray(current)) {
        current.push(next);
      } else {
        flags[name] = [String(current), next];
      }
      continue;
    }
    positionals.push(arg);
  }

  return { command, positionals, flags };
}

function flagValue(flags: CliFlags, name: string, fallback = ''): string {
  const value = flags[name];
  if (typeof value === 'string') return value;
  return fallback;
}

function flagBoolean(flags: CliFlags, name: string): boolean {
  return Boolean(flags[name]);
}

function flagList(flags: CliFlags, name: string): string[] {
  const value = flags[name];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.length > 0) return [value];
  return [];
}

async function loadStoryFile(filePath: string): Promise<any> {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

async function createFromStory(storyPath: string, baseDir: string): Promise<ContentProjectEnvelope> {
  const story = await loadStoryFile(storyPath);
  const result = await createProjectFromStory(story, baseDir);
  const metadata = buildContentMetadata(result.envelope);
  const envelope = setProjectMetadata(result.envelope, metadata);
  await saveProjectEnvelope(envelope, baseDir);
  return envelope;
}

async function createFromFlags(flags: CliFlags, baseDir: string): Promise<ContentProjectEnvelope> {
  const input: ContentProjectCreateInput = {
    tenantId: flagValue(flags, 'tenant'),
    channel: flagValue(flags, 'channel') as ContentChannel,
    series: flagValue(flags, 'series'),
    episode: flagValue(flags, 'episode') || undefined,
    title: flagValue(flags, 'title'),
    goal: flagValue(flags, 'goal', 'education') as ContentGoal,
    audience: flagValue(flags, 'audience', 'general'),
    format: flagValue(flags, 'format', 'youtube_short') as ContentFormat,
    preset: (flagValue(flags, 'preset') || undefined) as ContentChannel | undefined,
  };

  const envelope = await createProjectEnvelope(input, baseDir);
  await saveProjectEnvelope(envelope, baseDir);
  return envelope;
}

async function printList(baseDir: string): Promise<void> {
  const projects = await listProjectEnvelopes(baseDir);
  if (projects.length === 0) {
    console.log('No content projects found.');
    return;
  }
  for (const { project, scenes, assets } of projects) {
    console.log(`${project.id}\t${project.tenantId}\t${project.channel}\t${project.status}\t${scenes.length} scenes\t${assets.length} assets`);
  }
}

async function loadEnvelopeById(projectId: string, baseDir: string): Promise<ContentProjectEnvelope> {
  const found = await findProjectEnvelope(projectId, baseDir);
  if (!found) {
    throw new Error(`Project not found: ${projectId}`);
  }
  return found;
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function main(): Promise<void> {
  const { command, positionals, flags } = parseFlags(process.argv.slice(2));
  const baseDir = process.cwd();

  if (!command || flagBoolean(flags, 'help')) {
    printHelp();
    return;
  }

  if (command === 'list') {
    await printList(baseDir);
    return;
  }

  if (command === 'create') {
    const envelope = flagValue(flags, 'story')
      ? await createFromStory(flagValue(flags, 'story'), baseDir)
      : await createFromFlags(flags, baseDir);
    console.log(`${envelope.project.id}\t${envelope.project.tenantId}\t${envelope.project.channel}\t${envelope.project.status}`);
    return;
  }

  const projectId = positionals[0];
  if (!projectId) {
    throw new Error(`Missing project id for ${command}`);
  }

  const envelope = await loadEnvelopeById(projectId, baseDir);

  if (command === 'validate') {
    const result = await validateContentProject(envelope, baseDir);
    if (result.valid) {
      console.log('CONTENT_PROJECT_VALID');
      console.log(`Scenes: ${result.summary.scenes}`);
      console.log(`Duration: ${result.summary.durationSeconds}s`);
      console.log(`Assets: ${result.summary.assets}/${result.summary.assets}`);
      console.log(`Voice: ${result.summary.voice}/${result.summary.scenes}`);
      console.log(`Preset: ${result.summary.preset}`);
      console.log(`Ready to render: ${result.summary.readyToRender ? 'YES' : 'NO'}`);
      return;
    }
    console.log('CONTENT_PROJECT_INVALID');
    for (const error of result.errors) {
      console.log(`${error.code}: ${error.message}`);
    }
    process.exitCode = 1;
    return;
  }

  const preset = await loadContentChannelPreset(envelope.project.preset, baseDir);

  if (command === 'render-plan') {
    console.log(buildRenderPlan(envelope, preset));
    return;
  }

  if (command === 'render') {
    const result = await renderProject(projectId, baseDir);
    console.log(`final.mp4: ${result.finalPath}`);
    console.log(`thumbnail.jpg: ${result.thumbnailPath}`);
    console.log(`captions.srt: ${result.captionsPath}`);
    console.log(`metadata.json: ${result.metadataPath}`);
    return;
  }

  if (command === 'thumbnail') {
    const rendered = await renderProject(projectId, baseDir);
    console.log(`thumbnail.jpg: ${rendered.thumbnailPath}`);
    return;
  }

  if (command === 'metadata') {
    const metadata = buildContentMetadata(envelope);
    const outputPath = path.join(baseDir, 'artifacts', 'content', projectId, 'metadata.json');
    await writeJson(outputPath, metadata);
    console.log(JSON.stringify(metadata, null, 2));
    return;
  }

  if (command === 'approve' || command === 'reject') {
    const approval =
      command === 'approve'
        ? {
            state: 'approved' as const,
            approvedBy: flagValue(flags, 'by', 'human-review'),
            approvedAt: new Date().toISOString(),
            reviewNotes: flagValue(flags, 'notes') || undefined,
          }
        : {
            state: 'rejected' as const,
            reviewNotes: flagValue(flags, 'notes') || undefined,
          };
    const updated = setProjectApproval(envelope, approval);
    await saveProjectEnvelope(updated, baseDir);
    console.log(`${projectId}\t${updated.project.status}`);
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
