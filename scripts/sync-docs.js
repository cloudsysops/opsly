#!/usr/bin/env node
/**
 * Genera docs/IMPLEMENTATION-STATUS.md desde docs/implementation/status.yaml
 */
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const ROOT = path.join(__dirname, "..");
const YAML_PATH = path.join(ROOT, "docs", "implementation", "status.yaml");
const OUT_PATH = path.join(ROOT, "docs", "IMPLEMENTATION-STATUS.md");
const DOCS_DIR = path.join(ROOT, "docs");
const IMPL_DIR = path.join(ROOT, "docs", "implementation");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function mdEscapeCell(s) {
  if (s == null) {
    return "";
  }
  return String(s).replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function fileLink(relPath) {
  if (!relPath || typeof relPath !== "string") {
    return "—";
  }
  const clean = relPath.trim();
  if (clean.length === 0) {
    return "—";
  }
  return `[${clean}](${clean})`;
}

function main() {
  if (!fs.existsSync(YAML_PATH)) {
    console.error("❌ status.yaml not found:", YAML_PATH);
    process.exit(1);
  }

  let raw;
  try {
    raw = fs.readFileSync(YAML_PATH, "utf8");
  } catch (e) {
    console.error("❌ Cannot read status.yaml:", e instanceof Error ? e.message : e);
    process.exit(1);
  }

  let data;
  try {
    data = yaml.load(raw);
  } catch (e) {
    console.error("❌ Invalid YAML:", e instanceof Error ? e.message : e);
    process.exit(1);
  }

  if (!data || typeof data !== "object") {
    console.error("❌ Invalid YAML: root must be an object");
    process.exit(1);
  }

  ensureDir(DOCS_DIR);
  ensureDir(IMPL_DIR);

  const generatedAt = new Date().toISOString();
  const project = data.project ?? "Opsly";
  const lastCommit = data.last_commit ?? "—";
  const lastUpdated = data.last_updated ?? "—";

  const lines = [];
  lines.push(`# ${project} — Implementation status`);
  lines.push("");
  lines.push(`> **Generado automáticamente** — no editar a mano. Fuente: [\`docs/implementation/status.yaml\`](implementation/status.yaml).`);
  lines.push("");
  lines.push(`| Campo | Valor |`);
  lines.push(`| --- | --- |`);
  lines.push(`| Generado (ISO) | ${generatedAt} |`);
  lines.push(`| last_commit (YAML) | \`${String(lastCommit)}\` |`);
  lines.push(`| last_updated (YAML) | ${String(lastUpdated)} |`);
  lines.push("");

  const phases = Array.isArray(data.phases) ? data.phases : [];
  for (const ph of phases) {
    if (!ph || typeof ph !== "object") {
      continue;
    }
    const num = ph.number != null ? String(ph.number) : "?";
    const name = ph.name != null ? String(ph.name) : "Phase";
    const st = ph.status != null ? String(ph.status) : "—";
    lines.push(`## Phase ${num}: ${name}`);
    lines.push("");
    lines.push(`- **Status:** ${st}`);
    if (ph.started) {
      lines.push(`- **Started:** ${ph.started}`);
    }
    if (ph.estimated_completion) {
      lines.push(`- **Est. completion:** ${ph.estimated_completion}`);
    }
    if (ph.description) {
      lines.push(`- **Description:** ${ph.description}`);
    }
    if (Array.isArray(ph.dependencies) && ph.dependencies.length > 0) {
      lines.push(`- **Dependencies:** ${ph.dependencies.join(", ")}`);
    }
    lines.push("");

    const components = Array.isArray(ph.components) ? ph.components : [];
    if (components.length > 0) {
      lines.push("| Component | Status | Description | File |");
      lines.push("| --- | --- | --- | --- |");
      for (const c of components) {
        if (!c || typeof c !== "object") {
          continue;
        }
        const cn = mdEscapeCell(c.name);
        const cs = mdEscapeCell(c.status);
        const cd = mdEscapeCell(c.description);
        const cf = fileLink(c.file);
        lines.push(`| ${cn} | ${cs} | ${cd} | ${cf} |`);
      }
      lines.push("");

      for (const c of components) {
        if (!c || typeof c !== "object" || !Array.isArray(c.methods) || c.methods.length === 0) {
          continue;
        }
        lines.push(`### ${c.name} — methods`);
        lines.push("");
        for (const m of c.methods) {
          lines.push(`- \`${String(m)}\``);
        }
        lines.push("");
      }
    }
  }

  const blockers = Array.isArray(data.blockers) ? data.blockers : [];
  if (blockers.length > 0) {
    lines.push("## Blockers");
    lines.push("");
    for (const b of blockers) {
      if (!b || typeof b !== "object") {
        continue;
      }
      const sev = String(b.severity ?? "MEDIUM");
      const emoji =
        sev === "CRITICAL" ? "🔴" : sev === "HIGH" ? "🟠" : sev === "MEDIUM" ? "🟡" : "⚪";
      lines.push(`### ${emoji} ${b.title ?? "Blocker"}`);
      lines.push("");
      lines.push(`- **Severity:** ${sev}`);
      lines.push(`- **Status:** ${b.status ?? "OPEN"}`);
      lines.push(`- **Fix:** ${b.fix ?? "—"}`);
      lines.push("");
    }
  }

  const nextSteps = Array.isArray(data.next_steps) ? data.next_steps : [];
  if (nextSteps.length > 0) {
    lines.push("## Next steps");
    lines.push("");
    for (const step of nextSteps) {
      lines.push(`- [ ] ${String(step)}`);
    }
    lines.push("");
  }

  lines.push("---");
  lines.push("");
  lines.push(`*Última generación local/CI: ${generatedAt}*`);

  try {
    fs.writeFileSync(OUT_PATH, lines.join("\n") + "\n", "utf8");
  } catch (e) {
    console.error("❌ Cannot write IMPLEMENTATION-STATUS.md:", e instanceof Error ? e.message : e);
    process.exit(1);
  }

  console.log("✅ Generated docs/IMPLEMENTATION-STATUS.md");
}

main();
