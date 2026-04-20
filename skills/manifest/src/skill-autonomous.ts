/**
 * skill-autonomous.ts — Sistema de autonomía para skills
 * Decide qué skills cargar basándose en el contexto de la query
 */

import { findSkills, suggestChain, getSkillPath } from "../../../scripts/skill-finder.js";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

export interface AutonomyContext {
  query: string;
  intent: "create" | "modify" | "debug" | "deploy" | "monitor" | "analyze" | "unknown";
  domain: "api" | "bash" | "infra" | "ml" | "db" | "tenant" | "mcp" | "unknown";
  priority: "critical" | "high" | "medium" | "low";
  skills: string[];
  confidence: number;
  requiresConfirmation: boolean;
}

const INTENT_PATTERNS = {
  create: ["crear", "nuevo", "agregar", "add", "new", "implement", "build"],
  modify: ["modificar", "cambiar", "update", "change", "fix", "edit"],
  debug: ["debug", "error", "bug", "fallo", "problema", "fix"],
  deploy: ["deploy", "desplegar", "release", "production", "prod"],
  monitor: ["monitor", "métricas", "logs", "health", "status"],
  analyze: ["analizar", "arquitectura", "review", "audit", "diagnostic"]
};

const DOMAIN_PATTERNS = {
  api: ["api", "route", "endpoint", "rest", "handler"],
  bash: ["script", "bash", "shell", "automation"],
  infra: ["docker", "compose", "vps", "server", "deploy"],
  ml: ["llm", "ai", "ml", "model", "notebooklm", "feedback"],
  db: ["sql", "supabase", "postgres", "migration", "rls"],
  tenant: ["tenant", "onboard", "cliente", "suspend", "resume"],
  mcp: ["mcp", "tool", "oauth", "openclaw"]
};

function classifyIntent(query: string): AutonomyContext["intent"] {
  const q = query.toLowerCase();
  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
    if (patterns.some(p => q.includes(p))) {
      return intent as AutonomyContext["intent"];
    }
  }
  return "unknown";
}

function classifyDomain(query: string): AutonomyContext["domain"] {
  const q = query.toLowerCase();
  for (const [domain, patterns] of Object.entries(DOMAIN_PATTERNS)) {
    if (patterns.some(p => q.includes(p))) {
      return domain as AutonomyContext["domain"];
    }
  }
  return "unknown";
}

export function analyzeAutonomousContext(query: string): AutonomyContext {
  const skills = findSkills(query);
  const chain = suggestChain(query);

  const intent = classifyIntent(query);
  const domain = classifyDomain(query);

  const topSkill = skills[0];
  const confidence = topSkill ? topSkill.score / 100 : 0;

  const requiresConfirmation =
    confidence < 0.3 ||
    domain === "unknown" ||
    intent === "deploy";

  return {
    query,
    intent,
    domain,
    priority: topSkill?.priority || "low",
    skills: chain,
    confidence,
    requiresConfirmation
  };
}

export function getAutonomousPlan(context: AutonomyContext) {
  const plan: string[] = [];

  // Always start with context bootstrap for critical/high priority
  if (context.priority === "critical" || context.priority === "high") {
    plan.push("opsly-context");
  }

  // Add domain-specific skills
  const domainSkillMap: Record<string, string[]> = {
    api: ["opsly-api", "opsly-supabase"],
    bash: ["opsly-bash", "opsly-tenant"],
    infra: ["opsly-supabase", "opsly-tenant", "opsly-simplify"],
    ml: ["opsly-llm", "opsly-feedback-ml"],
    db: ["opsly-supabase"],
    tenant: ["opsly-tenant", "opsly-api"],
    mcp: ["opsly-mcp", "opsly-api"]
  };

  if (context.domain !== "unknown" && domainSkillMap[context.domain]) {
    for (const skill of domainSkillMap[context.domain]) {
      if (!plan.includes(skill)) {
        plan.push(skill);
      }
    }
  }

  // Add suggested chain
  for (const skill of context.skills) {
    if (!plan.includes(skill)) {
      plan.push(skill);
    }
  }

  return plan;
}

export function loadSkillContent(skillName: string): { name: string; content: string; manifest: object | null } | null {
  const path = getSkillPath(skillName);
  const basePath = join(process.cwd(), "..", path);
  const mdPath = join(basePath, "SKILL.md");
  const manifestPath = join(basePath, "manifest.json");

  if (!existsSync(mdPath)) {
    return null;
  }

  return {
    name: skillName,
    content: readFileSync(mdPath, "utf-8"),
    manifest: existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf-8")) : null
  };
}

export async function autonomousExecute(query: string): Promise<{
  context: AutonomyContext;
  plan: string[];
  skills: ReturnType<typeof loadSkillContent>[];
}> {
  const context = analyzeAutonomousContext(query);
  const plan = getAutonomousPlan(context);
  const skills = plan.map(s => loadSkillContent(s)).filter(Boolean) as ReturnType<typeof loadSkillContent>[];

  return { context, plan, skills };
}

// CLI
if (import.meta.url.endsWith(process.argv[1]?.replace(/^file:\/\//, "") || "")) {
  const query = process.argv.slice(2).join(" ");
  if (!query) {
    console.log("Usage: skill-autonomous.ts <query>");
    process.exit(1);
  }

  const result = await autonomousExecute(query);

  console.log("\n🤖 Autonomous Execution Plan");
  console.log("─".repeat(50));
  console.log(`Query: ${result.context.query}`);
  console.log(`Intent: ${result.context.intent}`);
  console.log(`Domain: ${result.context.domain}`);
  console.log(`Confidence: ${(result.context.confidence * 100).toFixed(0)}%`);
  console.log(`Requires Confirmation: ${result.context.requiresConfirmation ? "⚠️ Yes" : "✅ No"}`);
  console.log(`\nPlan: ${result.plan.join(" → ")}`);
  console.log(`\nLoaded ${result.skills.length} skills`);
}
