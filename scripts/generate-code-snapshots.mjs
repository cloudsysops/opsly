#!/usr/bin/env node
/**
 * Genera docs/CODE-SNAPSHOTS.md con recortes de archivos clave para indexación manual / NotebookLM.
 * Uso: node scripts/generate-code-snapshots.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const FILES = [
  "packages/types/src/hermes.ts",
  "apps/orchestrator/src/hermes/DecisionEngine.ts",
  "apps/orchestrator/src/hermes/HermesOrchestrator.ts",
  "apps/orchestrator/src/lib/notebooklm-client.ts",
];

let out = `# Code snapshots (auto)\n\nGenerado por scripts/generate-code-snapshots.mjs — no editar a mano.\n\n`;

for (const rel of FILES) {
  try {
    const text = readFileSync(join(root, rel), "utf8");
    out += `## ${rel}\n\n\`\`\`typescript\n${text.slice(0, 12_000)}\n\`\`\`\n\n`;
  } catch (e) {
    out += `## ${rel}\n\n_(no encontrado: ${e instanceof Error ? e.message : String(e)})_\n\n`;
  }
}

const target = join(root, "docs", "CODE-SNAPSHOTS.md");
writeFileSync(target, out, "utf8");
process.stdout.write(`✅ Wrote ${target}\n`);
