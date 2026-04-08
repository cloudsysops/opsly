import { readdir } from "node:fs/promises";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  parseYamlLikeFrontmatter,
  yamlFrontmatterLooksPopulated,
} from "./yaml-frontmatter.js";

export interface SkillManifest {
  name?: string;
  version?: string;
  description?: string;
  inputSchema?: unknown;
  outputSchema?: unknown;
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;

function tryParseFrontmatterBlock(block: string): {
  manifest: SkillManifest;
  format: "json" | "yaml" | "none";
} {
  const t = block.trim();
  if (!t) return { manifest: {}, format: "none" };
  try {
    return { manifest: parseJsonManifest(t), format: "json" };
  } catch {
    const y = parseYamlLikeFrontmatter(t);
    if (yamlFrontmatterLooksPopulated(y)) {
      return { manifest: { ...y }, format: "yaml" };
    }
    return { manifest: {}, format: "none" };
  }
}

function parseJsonManifest(raw: string): SkillManifest {
  const t = raw.trim();
  if (!t) return {};
  const data = JSON.parse(t) as unknown;
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Skill manifest JSON must be an object");
  }
  const o = data as Record<string, unknown>;
  const out: SkillManifest = {};
  if (typeof o.name === "string") out.name = o.name;
  if (typeof o.version === "string") out.version = o.version;
  if (typeof o.description === "string") out.description = o.description;
  if ("inputSchema" in o) out.inputSchema = o.inputSchema;
  if ("outputSchema" in o) out.outputSchema = o.outputSchema;
  return out;
}

export function parseSkillMarkdown(content: string): {
  manifest: SkillManifest;
  body: string;
  frontmatterFormat?: "json" | "yaml";
} {
  const m = content.match(FRONTMATTER_RE);
  if (!m) return { manifest: {}, body: content };
  const { manifest, format } = tryParseFrontmatterBlock(m[1] ?? "");
  if (format === "none") return { manifest: {}, body: content };
  return {
    manifest,
    body: m[2] ?? "",
    frontmatterFormat: format === "json" ? "json" : "yaml",
  };
}

export function parseManifestJsonFile(text: string): SkillManifest {
  return parseJsonManifest(text);
}

export function mergeManifests(base: SkillManifest, override: SkillManifest): SkillManifest {
  return { ...base, ...override };
}

export interface LoadedSkillPackage {
  manifest: SkillManifest;
  body: string;
  manifestSources: Array<"frontmatter" | "manifest.json">;
}

export async function loadSkillPackage(skillDir: string): Promise<LoadedSkillPackage> {
  const mdPath = join(skillDir, "SKILL.md");
  const raw = await readFile(mdPath, "utf8");
  const { manifest: fm, body, frontmatterFormat } = parseSkillMarkdown(raw);
  const sources: LoadedSkillPackage["manifestSources"] = [];
  if (frontmatterFormat !== undefined) sources.push("frontmatter");
  let merged = fm;
  try {
    const jsonPath = join(skillDir, "manifest.json");
    const jtext = await readFile(jsonPath, "utf8");
    merged = mergeManifests(fm, parseManifestJsonFile(jtext));
    sources.push("manifest.json");
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    if (err.code !== "ENOENT") throw e;
  }
  return { manifest: merged, body, manifestSources: sources };
}

export interface ValidateUserSkillsResult {
  ok: boolean;
  skills: Array<{ folder: string; name: string; version?: string }>;
  errors: string[];
}

export async function validateAllUserSkills(
  userSkillsRoot: string,
): Promise<ValidateUserSkillsResult> {
  const errors: string[] = [];
  const skills: Array<{ folder: string; name: string; version?: string }> = [];
  let entries;
  try {
    entries = await readdir(userSkillsRoot, { withFileTypes: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, skills, errors: [`${userSkillsRoot}: ${msg}`] };
  }
  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    const dir = join(userSkillsRoot, ent.name);
    try {
      const pkg = await loadSkillPackage(dir);
      const declared = pkg.manifest.name;
      if (declared !== undefined && declared !== ent.name) {
        errors.push(
          `${ent.name}: manifest.name "${declared}" debe coincidir con el directorio`,
        );
      }
      const name = declared ?? ent.name;
      skills.push({ folder: ent.name, name, version: pkg.manifest.version });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${ent.name}: ${msg}`);
    }
  }
  return {
    ok: errors.length === 0,
    skills: skills.sort((a, b) => a.folder.localeCompare(b.folder)),
    errors,
  };
}
