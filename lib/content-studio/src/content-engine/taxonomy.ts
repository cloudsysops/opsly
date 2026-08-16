import fs from 'node:fs';
import path from 'node:path';
import { resolveRepoRoot } from './paths.js';
import type { ContentFormatTemplate, ContentPortal } from './types.js';

export interface ContentPortalDefinition {
  id: ContentPortal;
  label: string;
  topics: string[];
}

export interface ContentFormatDefinition {
  id: ContentFormatTemplate;
  hookStyle: string;
  sceneStructure: string[];
  pace: string;
  targetDurationSec: number;
  character: string;
  portal: ContentPortal;
  ctaStyle: string;
  captionStyle: string;
  visualTreatment: string;
}

function readJson<T>(relativePath: string, baseDir = process.cwd()): T {
  const full = path.join(resolveRepoRoot(baseDir), relativePath);
  return JSON.parse(fs.readFileSync(full, 'utf8')) as T;
}

export function loadContentPortals(baseDir = process.cwd()): ContentPortalDefinition[] {
  return readJson<ContentPortalDefinition[]>('config/content-portals.json', baseDir);
}

export function loadContentFormats(baseDir = process.cwd()): ContentFormatDefinition[] {
  return readJson<ContentFormatDefinition[]>('config/content-formats.json', baseDir);
}

export interface ContentCharacterDefinition {
  id: string;
  name: string;
  role: string;
  portals: ContentPortal[];
}

export function loadContentCharacters(baseDir = process.cwd()): ContentCharacterDefinition[] {
  return readJson<ContentCharacterDefinition[]>('config/content-characters.json', baseDir);
}

export function getContentPortal(id: ContentPortal, baseDir = process.cwd()): ContentPortalDefinition {
  const found = loadContentPortals(baseDir).find((portal) => portal.id === id);
  if (!found) {
    throw new Error(`Unknown portal: ${id}`);
  }
  return found;
}

export function getContentFormat(
  id: ContentFormatTemplate,
  baseDir = process.cwd()
): ContentFormatDefinition {
  const found = loadContentFormats(baseDir).find((format) => format.id === id);
  if (!found) {
    throw new Error(`Unknown format: ${id}`);
  }
  return found;
}
