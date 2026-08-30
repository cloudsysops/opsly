#!/usr/bin/env node
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildDialoguePrompt,
  buildImagePrompt,
  buildStoryPrompt,
  buildThumbnailPrompt,
  buildVideoPrompt,
  composeStory,
  getFoundation,
  getCharacter,
  getContext,
  listCharacters,
  writeCanonJson,
} from './index.js';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '../../..');

function printJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function argValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

function help(): string {
  return `opsly universe CLI

Usage:
  npm run universe -- characters
  npm run universe -- show nova
  npm run universe -- prompt nova image
  npm run universe -- story --characters nova,kai --topic "why robots learn" --world nexus
  npm run universe -- context --characters nova,kai --topic swimming --audience kids --tenant peskids
  npm run universe -- foundation
  npm run universe -- export
`;
}

function main(): void {
  const [, , command, ...rest] = process.argv;
  if (!command || command === 'help' || command === '--help') {
    process.stdout.write(help());
    return;
  }
  if (command === 'characters') {
    printJson(
      listCharacters().map((character) => ({
        id: character.id,
        slug: character.slug,
        name: character.name,
        archetype: character.archetype,
      })),
    );
    return;
  }
  if (command === 'show') {
    const ref = rest[0];
    if (!ref) throw new Error('show requires a character id');
    printJson(getCharacter(ref));
    return;
  }
  if (command === 'prompt') {
    const ref = rest[0];
    const modality = rest[1] ?? 'image';
    if (!ref) throw new Error('prompt requires a character id');
    const builders = {
      image: buildImagePrompt,
      video: buildVideoPrompt,
      dialogue: buildDialoguePrompt,
      story: buildStoryPrompt,
      thumbnail: buildThumbnailPrompt,
    } as const;
    const builder = builders[modality as keyof typeof builders];
    if (!builder) throw new Error(`Unknown modality: ${modality}`);
    printJson(builder({ character: ref, scene: argValue('--scene'), aspectRatio: argValue('--aspect') ?? '9:16' }));
    return;
  }
  if (command === 'story') {
    const characters = (argValue('--characters') ?? 'kai,nova').split(',').map((item) => item.trim());
    const [protagonist, ...companions] = characters;
    printJson(
      composeStory({
        protagonist,
        companions,
        world: argValue('--world') ?? 'nexus',
        topic: argValue('--topic') ?? 'curiosity',
        conflict: argValue('--conflict') ?? 'the question is bigger than the first answer',
        educationalObjective: argValue('--learn') ?? 'stay curious without fake certainty',
        emotionalObjective: argValue('--feel') ?? 'wonder is allowed',
        duration: Number(argValue('--duration') ?? '45'),
        audience: 'kids',
        language: 'es',
      }),
    );
    return;
  }
  if (command === 'context') {
    const characters = (argValue('--characters') ?? 'nova,kai').split(',').map((item) => item.trim());
    printJson(
      getContext({
        characters,
        topic: argValue('--topic') ?? 'robots',
        audience: (argValue('--audience') as 'kids' | 'family' | 'general' | 'educators') ?? 'kids',
        format: argValue('--format') ?? 'youtube-short',
        tenant: argValue('--tenant'),
        language: 'es',
      }),
    );
    return;
  }
  if (command === 'foundation') {
    printJson(getFoundation());
    return;
  }
  if (command === 'export') {
    const out = join(repoRoot, 'config/universe');
    const files = writeCanonJson(out);
    printJson({ ok: true, files });
    return;
  }
  throw new Error(`Unknown command: ${command}\n${help()}`);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}
