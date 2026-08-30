import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  getCharacter,
  listCharacters,
  type UniverseCharacter,
} from '@intcloudsysops/universe';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_LEGACY_DIR = join(__dirname, '../../../../data/content/characters');

/**
 * Render-facing projection of a character. Canonical identity lives in
 * `@intcloudsysops/universe`. JSON under `data/content/characters/` is
 * append-only legacy (opsly-origins extras), not a parallel bible.
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
  source: 'universe' | 'legacy-json';
}

const canonCache = new Map<string, CanonCharacter>();

export class CanonCharacterNotFoundError extends Error {
  constructor(public readonly id: string) {
    super(`Canon character "${id}" not found in @intcloudsysops/universe or legacy JSON`);
    this.name = 'CanonCharacterNotFoundError';
  }
}

function narrativeRoleFor(character: UniverseCharacter): string {
  const blob = `${character.archetype} ${character.role}`.toLowerCase();
  if (blob.includes('antagonist')) return 'antagonist';
  if (blob.includes('mentor') || blob.includes('guide')) return 'guide';
  if (blob.includes('companion') || blob.includes('supporter')) return 'supporter';
  return 'protagonist';
}

export function projectUniverseCharacter(character: UniverseCharacter): CanonCharacter {
  const negatives = [
    ...character.visualIdentity.dna.negatives,
    ...character.communication.forbiddenPatterns,
  ];
  return {
    id: character.id,
    canonical_name: character.name,
    also_known_as: character.aliases,
    role: character.role,
    personality: {
      archetype: character.archetype,
      traits: character.personality.traits,
      narrative_role: narrativeRoleFor(character),
    },
    visual: {
      silhouette_prompt: character.visualIdentity.silhouette,
      proportions: { head: 1, torso: 2, legs: 2 },
      face: {
        eye_style: character.visualIdentity.face,
        mouth_style: character.animationIdentity.emotionalExpressions[0] ?? 'neutral',
        expressions: character.animationIdentity.emotionalExpressions,
      },
      clothing: {
        primary: character.visualIdentity.clothing,
        accessories: character.visualIdentity.accessories,
        symbols: character.visualIdentity.symbols,
      },
      color_palette: [
        ...character.visualIdentity.primaryPalette,
        ...character.visualIdentity.secondaryPalette,
      ],
      mechanical_elements: character.visualIdentity.materials,
      generation_prompt: character.promptAnchors.image,
      negative_prompt: negatives.join(', '),
    },
    voice: {
      language: 'both',
      tone: character.voiceIdentity.tone,
      speed: 'normal',
      sample_line: character.communication.catchphrases[0],
    },
    prohibited_variations: negatives,
    source: 'universe',
  };
}

function tryUniverseCharacter(id: string): UniverseCharacter | undefined {
  const candidates = [id, id.replace(/^the-/, ''), id.replace(/-/g, ' ')];
  for (const candidate of candidates) {
    try {
      return getCharacter(candidate);
    } catch {
      continue;
    }
  }
  return undefined;
}

function loadLegacyJson(id: string, canonDir: string): CanonCharacter {
  const path = join(canonDir, `${id}.json`);
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, 'utf8')) as unknown;
  } catch {
    throw new CanonCharacterNotFoundError(id);
  }
  const character = raw as CanonCharacter;
  return { ...character, source: 'legacy-json' };
}

/** Default: Universe. Pass `canonDir` only for isolated fixtures or legacy JSON. */
export function loadCanonCharacter(id: string, canonDir?: string): CanonCharacter {
  const cacheKey = `${canonDir ?? 'universe'}:${id}`;
  const cached = canonCache.get(cacheKey);
  if (cached) return cached;

  if (canonDir) {
    const loaded = loadLegacyJson(id, canonDir);
    canonCache.set(cacheKey, loaded);
    return loaded;
  }

  const fromUniverse = tryUniverseCharacter(id);
  if (fromUniverse) {
    const projected = projectUniverseCharacter(fromUniverse);
    canonCache.set(cacheKey, projected);
    return projected;
  }

  const legacy = loadLegacyJson(id, DEFAULT_LEGACY_DIR);
  canonCache.set(cacheKey, legacy);
  return legacy;
}

export function listCanonCharacterIds(canonDir?: string): string[] {
  if (canonDir) {
    try {
      return readdirSync(canonDir)
        .filter((file) => file.endsWith('.json'))
        .map((file) => file.replace(/\.json$/, ''))
        .sort();
    } catch {
      return [];
    }
  }

  const ids = new Set<string>(listCharacters().map((character) => character.id));
  ids.add('the-traveler');
  try {
    for (const file of readdirSync(DEFAULT_LEGACY_DIR)) {
      if (file.endsWith('.json')) ids.add(file.replace(/\.json$/, ''));
    }
  } catch {
    /* legacy dir optional */
  }
  return [...ids].sort();
}
