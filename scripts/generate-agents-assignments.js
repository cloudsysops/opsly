#!/usr/bin/env node
/**
 * Genera docs/AGENTS-ASSIGNMENTS.md desde docs/implementation/status.yaml (sección agents).
 */
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const ROOT = path.join(__dirname, "..");
const YAML_PATH = path.join(ROOT, "docs", "implementation", "status.yaml");
const OUT = path.join(ROOT, "docs", "AGENTS-ASSIGNMENTS.md");

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
  const lines = [];
  lines.push(`# ${project} — Agent assignments`);
  lines.push("");
  lines.push(`> **Generado automáticamente** — fuente: [\`docs/implementation/status.yaml\`](implementation/status.yaml).`);
  lines.push(`> Generado: ${gen}`);
  lines.push("");
  lines.push("Ver responsabilidades y flujos en [`docs/AGENTS-ORCHESTRATION.md`](AGENTS-ORCHESTRATION.md).");
  lines.push("");

  const agents = Array.isArray(data.agents) ? data.agents : [];
  if (agents.length === 0) {
    lines.push("_No hay bloque \`agents:\` en status.yaml._");
  }

  for (const ag of agents) {
    if (!ag || typeof ag !== "object") {
      continue;
    }
    lines.push(`## ${ag.name || "Agent"}`);
    lines.push("");
    lines.push(`- **Rol:** ${ag.role || "—"}`);
    if (Array.isArray(ag.capabilities)) {
      lines.push("- **Capabilities:**");
      for (const c of ag.capabilities) {
        lines.push(`  - ${c}`);
      }
    }
    if (Array.isArray(ag.tasks_assigned)) {
      lines.push("- **Tasks asignadas:**");
      for (const tid of ag.tasks_assigned) {
        lines.push(`  - \`${tid}\``);
      }
    }
    if (ag.success_rate) {
      lines.push(`- **Success rate (referencia):** ${ag.success_rate}`);
    }
    if (ag.last_task) {
      lines.push(`- **Última tarea:** ${ag.last_task}`);
    }
    if (ag.next_task) {
      lines.push(`- **Próxima tarea:** ${ag.next_task}`);
    }
    if (Array.isArray(ag.workflows)) {
      lines.push("- **Workflows (GitHub Actions):**");
      for (const w of ag.workflows) {
        lines.push(`  - \`${w}\``);
      }
    }
    if (ag.last_action) {
      lines.push(`- **Última acción:** ${ag.last_action}`);
    }
    if (ag.next_action) {
      lines.push(`- **Próxima acción:** ${ag.next_action}`);
    }

    const taskCount = Array.isArray(ag.tasks_assigned) ? ag.tasks_assigned.length : 0;
    if (taskCount > 12) {
      lines.push("");
      lines.push("> ⚠️ **Nota:** muchas tareas asignadas — revisar priorización.");
    } else if (taskCount === 0) {
      lines.push("");
      lines.push("> ℹ️ Sin tareas listadas — revisar Notion / asignación.");
    }
    lines.push("");
  }

  lines.push("---");
  lines.push("");
  lines.push("*No editar a mano — regenerar con `npm run docs:sync`.*");

  fs.writeFileSync(OUT, lines.join("\n") + "\n", "utf8");
  console.log("✅ Generated docs/AGENTS-ASSIGNMENTS.md");
}

main();
