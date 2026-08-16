import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
// lib/content-engine/(src|dist)/characters -> repo root -> data/content/characters
const DEFAULT_CANON_DIR = join(__dirname, '../../../../data/content/characters');

/**
 * Full character bible entry as authored in data/content/characters/*.json
 * (canon pulled in from PR #961) — silhouette/proportions/generation
 * prompts ready for an image-gen model, voice tone, and prohibited
 * variations a generator must never violate. This is the rich source of
 * truth; characters/presets.ts's lighter CharacterProfile is this
 * module's own minimal continuity record, not a competing definition.
 */
export interface CanonCharacter {
  id: string;
  canonical_name: string;
  also_known_as?: string[];
  role: string;
  personality: {
    archetype: string;
    traits: string[];
    narrative_role: string;
  };
  visual: {
    silhouette_prompt: string;
    proportions: Record<string, number>;
    face: {
      eye_style: string;
      mouth_style: string;
      expressions: string[];
    };
    clothing: {
      primary: string;
      accessories: string[];
      symbols: string[];
    };
    color_palette: string[];
    mechanical_elements?: string[];
    generation_prompt: string;
    negative_prompt: string;
  };
  voice: {
    language: string;
    tone: string;
    speed: string;
    sample_line: string;
  };
  prohibited_variations: string[];
}

const canonCache = new Map<string, CanonCharacter>();

export class CanonCharacterNotFoundError extends Error {
  constructor(public readonly id: string) {
    super(`Canon character "${id}" not found in data/content/characters/`);
    this.name = 'CanonCharacterNotFoundError';
  }
}

/** Loads a full character bible entry by id (e.g. "the-traveler", "nova", "wavo"). */
export function loadCanonCharacter(id: string, canonDir: string = DEFAULT_CANON_DIR): CanonCharacter {
  const cacheKey = `${canonDir}:${id}`;
  const cached = canonCache.get(cacheKey);
  if (cached) return cached;

  const path = join(canonDir, `${id}.json`);
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    throw new CanonCharacterNotFoundError(id);
  }
  const character = raw as CanonCharacter;
  canonCache.set(cacheKey, character);
  return character;
}

/** Lists every character id available in the canon bible. */
export function listCanonCharacterIds(canonDir: string = DEFAULT_CANON_DIR): string[] {
  try {
    return readdirSync(canonDir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.replace(/\.json$/, ''))
      .sort();
  } catch {
    return [];
  }
}
