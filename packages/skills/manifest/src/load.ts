import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parseSimpleFrontmatter } from './parse-frontmatter.js';
import { parseManifestJsonObject } from './manifest-json.js';
import type { LoadedSkillMetadata, SkillMetadata } from './types.js';

function frontmatterToMetadata(fm: Record<string, string>): Partial<SkillMetadata> {
  const out: Partial<SkillMetadata> = {};
  if (fm.name !== undefined) {
    out.name = fm.name;
  }
  if (fm.version !== undefined) {
    out.version = fm.version;
  }
  if (fm.description !== undefined) {
    out.description = fm.description;
  }
  return out;
}

function mergeMetadata(
  fromFm: Partial<SkillMetadata>,
  fromJson: SkillMetadata | undefined,
  folderName: string
): SkillMetadata {
  const baseName = fromJson?.name ?? fromFm.name ?? folderName;
  return {
    name: baseName,
    version: fromJson?.version ?? fromFm.version,
    description: fromJson?.description ?? fromFm.description,
    inputSchema: fromJson?.inputSchema,
    outputSchema: fromJson?.outputSchema,
  };
}

/**
 * Carga SKILL.md + manifest.json opcional bajo un directorio de skill.
 */
export function loadSkillMetadata(skillDir: string, folderName: string): LoadedSkillMetadata {
  const skillMd = join(skillDir, 'SKILL.md');
  const manifestPath = join(skillDir, 'manifest.json');

  if (!existsSync(skillMd)) {
    throw new Error(`Falta SKILL.md en ${skillDir}`);
  }

  const mdContent = readFileSync(skillMd, 'utf8');
  const { frontmatter, body } = parseSimpleFrontmatter(mdContent);
  const fmMeta = frontmatterToMetadata(frontmatter);

  let manifest: SkillMetadata | undefined;
  let manifestJsonPath: string | undefined;
  if (existsSync(manifestPath)) {
    const raw = JSON.parse(readFileSync(manifestPath, 'utf8')) as unknown;
    manifest = parseManifestJsonObject(raw);
    manifestJsonPath = manifestPath;
  }

  const metadata = mergeMetadata(fmMeta, manifest, folderName);

  return {
    metadata,
    bodyMarkdown: body,
    paths: {
      skillMd,
      manifestJson: manifestJsonPath,
    },
  };
}

export interface ValidateSkillsResult {
  ok: boolean;
  skills: Array<{ folder: string; name: string; version?: string }>;
  errors: string[];
}

/**
 * Valida todos los directorios en skills/user con SKILL.md.
 */
export function validateAllUserSkills(userSkillsRoot: string): ValidateSkillsResult {
  const errors: string[] = [];
  const skills: Array<{ folder: string; name: string; version?: string }> = [];

  if (!existsSync(userSkillsRoot)) {
    return { ok: false, skills, errors: [`No existe ${userSkillsRoot}`] };
  }

  const entries = readdirSync(userSkillsRoot);
  for (const name of entries) {
    const dir = join(userSkillsRoot, name);
    if (!statSync(dir).isDirectory()) {
      continue;
    }
    const skillMd = join(dir, 'SKILL.md');
    if (!existsSync(skillMd)) {
      errors.push(`${name}: sin SKILL.md`);
      continue;
    }
    try {
      const loaded = loadSkillMetadata(dir, name);
      if (loaded.metadata.name !== name) {
        errors.push(
          `${name}: metadata.name "${loaded.metadata.name}" no coincide con directorio (recomendado: mismo nombre)`
        );
      }
      skills.push({
        folder: name,
        name: loaded.metadata.name,
        version: loaded.metadata.version,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${name}: ${msg}`);
    }
  }

  return {
    ok: errors.length === 0,
    skills: skills.sort((a, b) => a.folder.localeCompare(b.folder)),
    errors,
  };
}
