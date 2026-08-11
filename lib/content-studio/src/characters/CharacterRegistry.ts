import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CharacterProfile } from '../types.js';
import { CharacterProfileSchema } from './schema.js';

export interface CharacterRegistryOptions {
  /** Directory containing one JSON file per character (default: content/characters). */
  charactersDir: string;
}

function readJson(path: string): unknown {
  const raw = readFileSync(path, 'utf-8');
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Invalid JSON in ${path}: ${(error as Error).message}`);
  }
}

/** Validate and return a single character profile from a JSON file. */
export function loadCharacter(filePath: string): CharacterProfile {
  const parsed = CharacterProfileSchema.safeParse(readJson(filePath));
  if (!parsed.success) {
    throw new Error(
      `Character validation failed for ${filePath}: ${parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; ')}`
    );
  }
  return parsed.data;
}

/** Load and validate every character JSON file in charactersDir. */
export function loadAllCharacters(options: CharacterRegistryOptions): CharacterProfile[] {
  const files = readdirSync(options.charactersDir).filter((f) => f.endsWith('.json'));
  return files
    .map((file) => loadCharacter(join(options.charactersDir, file)))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export class CharacterRegistry {
  private readonly charactersDir: string;
  private cache: Map<string, CharacterProfile> | null = null;

  constructor(options: CharacterRegistryOptions) {
    this.charactersDir = options.charactersDir;
  }

  private ensureLoaded(): Map<string, CharacterProfile> {
    if (!this.cache) {
      const characters = loadAllCharacters({ charactersDir: this.charactersDir });
      this.cache = new Map(characters.map((c) => [c.id, c]));
    }
    return this.cache;
  }

  getAll(): CharacterProfile[] {
    return Array.from(this.ensureLoaded().values());
  }

  getById(id: string): CharacterProfile | undefined {
    return this.ensureLoaded().get(id);
  }

  requireById(id: string): CharacterProfile {
    const character = this.getById(id);
    if (!character) {
      throw new Error(`Character not found: ${id}`);
    }
    return character;
  }
}
