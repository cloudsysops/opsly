#!/usr/bin/env node
/**
 * Genera docs/generated/sprint-status.auto.md desde
 * docs/implementation/status.yaml (sección sprints).
 */
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const ROOT = path.join(__dirname, "..");
const YAML_PATH = path.join(ROOT, "docs", "implementation", "status.yaml");
const OUT = path.join(ROOT, "docs", "generated", "sprint-status.auto.md");

function asciiBurndown(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return "_Sin serie burndown en YAML — ejecutar `npm run sprint:burndown` tras Notion._\n";
  }
  const lines = ["```", "Day    Target  Actual"];
  for (const r of rows) {
    const d = (r.date || "?").slice(0, 10);
    const t = r.target != null ? String(r.target) : "?";
    const a = r.actual != null ? String(r.actual) : "?";
    lines.push(`${d}  ${t.padStart(4)}  ${a.padStart(4)}`);
  }
  lines.push("```");
  return lines.join("\n");
}

function main() {
  if (!fs.existsSync(YAML_PATH)) {
    console.error("❌ status.yaml not found");
    process.exit(1);
  }
  let data;
  try {
    data = yaml.load(fs.readFileSync(YAML_PATH, "utf8"));
  } catch (e) {
    console.error("❌ Invalid YAML:", e instanceof Error ? e.message : e);
    process.exit(1);
  }

  const gen = new Date().toISOString();
  const project = data.project || "Opsly";
  const outDir = path.dirname(OUT);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  const lines = [];
  lines.push("---");
  lines.push("status: generated");
  lines.push("source: docs/implementation/status.yaml");
  lines.push("generated_by: scripts/generate-sprint-tracking.js");
  lines.push("do_not_edit: true");
  lines.push("---");
  lines.push("");
  lines.push("<!-- This file is auto-generated. Do not edit manually. -->");
  lines.push("<!-- See docs/generated/README.md for details. -->");
  lines.push("<!-- For human-authored sprint execution, see ../../SPRINT-TRACKER.md -->");
  lines.push("");
  lines.push(`# ${project} — Sprint Status (Auto-Generated)`);
  lines.push("");
  lines.push(
    `> **Generado automáticamente** — fuente: [\`docs/implementation/status.yaml\`](../implementation/status.yaml).`,
  );
  lines.push(`> Generado: ${gen}`);
  lines.push("");

  const sprints = Array.isArray(data.sprints) ? data.sprints : [];
  if (sprints.length === 0) {
    lines.push("_No hay bloque \`sprints:\` en status.yaml._");
  }

  for (const sp of sprints) {
    if (!sp || typeof sp !== "object") {
      continue;
    }
    lines.push(`## Sprint ${sp.number ?? "?"}: ${sp.name || "—"}`);
    lines.push("");
    lines.push(`- **Estado:** ${sp.status || "—"}`);
    if (sp.dates && typeof sp.dates === "object") {
      lines.push(`- **Inicio / fin:** ${sp.dates.start || "—"} → ${sp.dates.end || "—"}`);
    }
    if (Array.isArray(sp.goals)) {
      lines.push("- **Goals:**");
      for (const g of sp.goals) {
        lines.push(`  - ${g}`);
      }
    }
    if (sp.capacity != null) {
      lines.push(`- **Capacity (h):** ${String(sp.capacity)}`);
    }
    if (sp.burn_down && typeof sp.burn_down === "object") {
      const bd = sp.burn_down;
      lines.push("");
      lines.push("| Métrica | Valor |");
      lines.push("| --- | --- |");
      if (bd.target != null) {
        lines.push(`| Target | ${String(bd.target)} |`);
      }
      if (bd.actual != null) {
        lines.push(`| Actual (último) | ${String(bd.actual)} |`);
      }
      lines.push("");
      lines.push("### Burndown (serie)");
      lines.push("");
      lines.push(asciiBurndown(bd.series));
    }

    lines.push("");
    lines.push("### Tasks");
    lines.push("");
    const tasks = Array.isArray(sp.tasks) ? sp.tasks : [];
    if (tasks.length === 0) {
      lines.push("_Sin tareas en YAML._");
    } else {
      lines.push("| id | name | type | status | assignee | effort |");
      lines.push("| --- | --- | --- | --- | --- | --- |");
      for (const t of tasks) {
        lines.push(
          `| ${t.id || "—"} | ${t.name || "—"} | ${t.type || "—"} | ${t.status || "—"} | ${t.assignee || "—"} | ${t.effort || "—"} |`,
        );
      }
    }
    lines.push("");
  }

  lines.push("## Blockers (resumen)");
  lines.push("");
  const blockers = Array.isArray(data.blockers) ? data.blockers : [];
  if (blockers.length === 0) {
    lines.push("_Ver docs/generated/implementation-progress.auto.md._");
  } else {
    for (const b of blockers) {
      lines.push(`- **${b.severity || "?"}:** ${b.title || "—"} — ${b.fix || ""}`);
    }
  }

  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("*No editar a mano — regenerar con `npm run docs:sync`.*");

  fs.writeFileSync(OUT, lines.join("\n") + "\n", "utf8");
  console.log("✅ Generated docs/generated/sprint-status.auto.md");
}

main();
