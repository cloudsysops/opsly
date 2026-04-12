#!/usr/bin/env node
import { executeNotebookLM } from "@intcloudsysops/notebooklm-agent";

const q = process.argv.slice(2).join(" ").trim();
if (!q) {
  process.stderr.write('Uso: node scripts/query-notebooklm.mjs "tu pregunta"\n');
  process.exit(1);
}

const nb = process.env.NOTEBOOKLM_NOTEBOOK_ID?.trim();
if (!nb) {
  process.stderr.write("NOTEBOOKLM_NOTEBOOK_ID requerido\n");
  process.exit(1);
}

const r = await executeNotebookLM({
  action: "ask",
  tenant_slug: process.env.NOTEBOOKLM_DEFAULT_TENANT_SLUG?.trim() || "platform",
  notebook_id: nb,
  question: q,
});

process.stdout.write(`${JSON.stringify(r, null, 2)}\n`);
process.exit(r.success ? 0 : 1);
