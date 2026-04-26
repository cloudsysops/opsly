import type { SkillMetadata } from './types.js';

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Parsea manifest.json; valida forma mínima. */
export function parseManifestJsonObject(raw: unknown): SkillMetadata {
  if (!isPlainObject(raw)) {
    throw new Error('manifest.json debe ser un objeto JSON');
  }
  const name = raw.name;
  if (typeof name !== 'string' || name.trim() === '') {
    throw new Error('manifest.json requiere "name" (string no vacío)');
  }
  const out: SkillMetadata = { name: name.trim() };
  if (raw.version !== undefined) {
    if (typeof raw.version !== 'string') {
      throw new Error('"version" debe ser string');
    }
    out.version = raw.version;
  }
  if (raw.description !== undefined) {
    if (typeof raw.description !== 'string') {
      throw new Error('"description" debe ser string');
    }
    out.description = raw.description;
  }
  if (raw.inputSchema !== undefined) {
    if (!isPlainObject(raw.inputSchema)) {
      throw new Error('"inputSchema" debe ser un objeto JSON');
    }
    out.inputSchema = raw.inputSchema;
  }
  if (raw.outputSchema !== undefined) {
    if (!isPlainObject(raw.outputSchema)) {
      throw new Error('"outputSchema" debe ser un objeto JSON');
    }
    out.outputSchema = raw.outputSchema;
  }
  return out;
}
