import { execSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import {
  ContextPackSchema,
  type ContextPack,
  type ContextPackAdr,
} from "@intcloudsysops/types";
import { loadKnowledgeIndex, repoRoot } from "./knowledge-index.js";

const STALE_MS = 24 * 60 * 60 * 1000;
const MAX_ADR_FILES = 50;

function getSupabase() {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    return null;
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

function safeGitRev(): string | undefined {
  try {
    const root = repoRoot();
    return execSync("git rev-parse --short HEAD", {
      cwd: root,
      encoding: "utf8",
    }).trim();
  } catch {
    return undefined;
  }
}

function safeGitBranch(): string | undefined {
  try {
    const root = repoRoot();
    return execSync("git rev-parse --abbrev-ref HEAD", {
      cwd: root,
      encoding: "utf8",
    }).trim();
  } catch {
    return undefined;
  }
}

async function loadMarkdownRel(rel: string): Promise<string | undefined> {
  try {
    return await readFile(join(repoRoot(), rel), "utf8");
  } catch {
    return undefined;
  }
}

function parseAdrFile(filename: string, content: string): ContextPackAdr {
  const idMatch = filename.match(/(ADR-\d+)/i);
  const id = idMatch?.[1] ?? filename.replace(/\.md$/i, "");
  const lines = content.split(/\r?\n/);
  let title = id;
  for (const line of lines) {
    const m = line.match(/^#\s+(.+)$/);
    if (m) {
      title = m[1].trim();
      break;
    }
  }
  let status: string | undefined;
  const statusM = content.match(/\*\*Estado:\*\*\s*(.+)/i);
  if (statusM) {
    status = statusM[1].trim();
  }

  let summary = "";
  const decIdx = content.indexOf("## Decisión");
  if (decIdx >= 0) {
    const after = content.slice(decIdx);
    const nextH2 = after.indexOf("\n## ", 4);
    const block = nextH2 >= 0 ? after.slice(0, nextH2) : after;
    summary = block
      .replace(/^##\s+Decisión\s*/i, "")
      .replace(/^#+\s+/gm, "")
      .trim()
      .slice(0, 500);
  }
  if (!summary) {
    summary = content
      .slice(0, 400)
      .replace(/\s+/g, " ")
      .trim();
  }

  return { id, title, status, summary };
}

async function loadAdrs(): Promise<ContextPackAdr[]> {
  const dir = join(repoRoot(), "docs", "adr");
  let names: string[] = [];
  try {
    names = await readdir(dir);
  } catch {
    return [];
  }
  const md = names.filter((n) => n.endsWith(".md")).sort();
  const out: ContextPackAdr[] = [];
  for (const name of md.slice(0, MAX_ADR_FILES)) {
    try {
      const content = await readFile(join(dir, name), "utf8");
      out.push(parseAdrFile(name, content));
    } catch {
      // omitir ADR ilegible
    }
  }
  return out;
}

export interface BuildContextPackInput {
  tenantId?: string;
  tenantSlug?: string;
}

/**
 * Ensambla un Context Pack para OpenClaw: identidad tenant, VISION/AGENTS, ADRs,
 * estado de índice de conocimiento y metadatos Git del repo montado.
 */
export async function buildContextPack(
  input: BuildContextPackInput,
): Promise<ContextPack> {
  const warnings: string[] = [];
  const supabase = getSupabase();
  if (!supabase) {
    warnings.push("supabase_not_configured");
    throw new Error("supabase_not_configured");
  }

  if (!input.tenantId?.trim() && !input.tenantSlug?.trim()) {
    throw new Error("missing_tenant");
  }

  const base = supabase
    .schema("platform")
    .from("tenants")
    .select("id, slug, name, plan, status, services, metadata");

  let tenantRow: {
    id: string;
    slug: string;
    name: string;
    plan: string | null;
    status: string | null;
    services: unknown;
    metadata: unknown;
  } | null = null;

  if (input.tenantId?.trim()) {
    const { data, error } = await base
      .eq("id", input.tenantId.trim())
      .maybeSingle();
    if (error) {
      warnings.push(`tenant_query:${error.message}`);
    }
    tenantRow = data;
  } else if (input.tenantSlug?.trim()) {
    const { data, error } = await base
      .eq("slug", input.tenantSlug.trim())
      .maybeSingle();
    if (error) {
      warnings.push(`tenant_query:${error.message}`);
    }
    tenantRow = data;
  }

  if (!tenantRow) {
    throw new Error("tenant_not_found");
  }

  const meta =
    tenantRow.metadata && typeof tenantRow.metadata === "object"
      ? (tenantRow.metadata as Record<string, unknown>)
      : {};

  const techRaw = meta.tech_stack;
  let tech_stack: Record<string, string> | undefined;
  if (techRaw && typeof techRaw === "object" && !Array.isArray(techRaw)) {
    const entries = Object.entries(techRaw as Record<string, unknown>).filter(
      ([, v]) => typeof v === "string",
    ) as [string, string][];
    if (entries.length > 0) {
      tech_stack = Object.fromEntries(entries);
    }
  }

  const coding_standards =
    typeof meta.coding_standards === "string" ? meta.coding_standards : undefined;
  const business_domain =
    typeof meta.business_domain === "string" ? meta.business_domain : undefined;
  const domain =
    typeof meta.domain === "string"
      ? meta.domain
      : typeof meta.public_domain === "string"
        ? meta.public_domain
        : undefined;

  const [vision, agents_manifest, adrs, index] = await Promise.all([
    loadMarkdownRel("VISION.md"),
    loadMarkdownRel("AGENTS.md"),
    loadAdrs(),
    loadKnowledgeIndex(),
  ]);

  let knowledge_index_stale: boolean | undefined;
  let knowledge_index_generated_at: string | undefined;
  if (index?.generated_at) {
    knowledge_index_generated_at = index.generated_at;
    const t = Date.parse(index.generated_at);
    if (Number.isFinite(t) && Date.now() - t > STALE_MS) {
      knowledge_index_stale = true;
      warnings.push("stale_knowledge_index");
    }
  } else {
    warnings.push("knowledge_index_missing");
  }

  const generated_at = new Date().toISOString();

  const system_instructions = [
    `Eres un agente Opsly para el tenant "${tenantRow.name}" (slug: ${tenantRow.slug}, plan: ${tenantRow.plan ?? "unknown"}).`,
    "Sigue VISION.md, AGENTS.md y los ADRs listados. Usa herramientas MCP/OpenClaw según el plan y políticas de la plataforma.",
  ].join(" ");

  const pack = {
    tenant_id: tenantRow.id,
    tenant_slug: tenantRow.slug,
    generated_at,
    warnings: warnings.length > 0 ? warnings : undefined,
    identity: {
      name: tenantRow.name,
      plan: tenantRow.plan ?? undefined,
      domain,
      tech_stack,
      coding_standards,
      business_domain,
    },
    knowledge: {
      vision,
      agents_manifest,
      adrs,
    },
    state: {
      knowledge_index_generated_at,
      knowledge_index_stale,
      last_commit: safeGitRev(),
      active_branch: safeGitBranch(),
      recent_errors: undefined,
      relevant_embeddings: undefined,
    },
    system_instructions,
  };

  return ContextPackSchema.parse(pack);
}
