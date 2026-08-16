import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { CANON_VERSION, PROMPT_VERSION } from './constants.js';
import { getLore, getUniverseStyle, listCharacters, listRelationships, listWorlds } from './registry.js';
import { CanonSnapshotSchema } from './schemas.js';
import type { CanonSnapshot } from './types.js';
import {
  GLOBAL_SAFETY_RULES,
  GLOBAL_STORY_RULES,
  GLOBAL_VISUAL_RULES,
} from './visual/universe-style.js';

export function serializeCanon(generatedAt = new Date().toISOString()): CanonSnapshot {
  return CanonSnapshotSchema.parse({
    canonVersion: CANON_VERSION,
    promptVersion: PROMPT_VERSION,
    generatedAt,
    characters: listCharacters(),
    worlds: listWorlds(),
    relationships: listRelationships(),
    lore: getLore(),
    universeStyle: getUniverseStyle(),
    storyRules: GLOBAL_STORY_RULES,
    visualRules: GLOBAL_VISUAL_RULES,
    safetyRules: GLOBAL_SAFETY_RULES,
  });
}

export function writeCanonJson(configDir: string, generatedAt?: string): string[] {
  mkdirSync(configDir, { recursive: true });
  const snapshot = serializeCanon(generatedAt);
  const files: Array<[string, unknown]> = [
    ['canon.json', snapshot],
    ['characters.json', snapshot.characters],
    ['worlds.json', snapshot.worlds],
    ['relationships.json', snapshot.relationships],
  ];
  const written: string[] = [];
  for (const [name, data] of files) {
    const path = join(configDir, name);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
    written.push(path);
  }
  return written;
}
