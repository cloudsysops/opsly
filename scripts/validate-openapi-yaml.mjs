#!/usr/bin/env node
/**
 * Valida que docs/openapi-opsly-api.yaml sea YAML parseable y tenga estructura OpenAPI mínima.
 * Uso: node scripts/validate-openapi-yaml.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const specPath = path.join(root, "docs", "openapi-opsly-api.yaml");

const raw = fs.readFileSync(specPath, "utf8");
const doc = parse(raw);

if (doc === null || typeof doc !== "object" || Array.isArray(doc)) {
  console.error("validate-openapi-yaml: la raíz del documento debe ser un objeto");
  process.exit(1);
}

if (typeof doc.openapi !== "string" || doc.openapi.trim() === "") {
  console.error("validate-openapi-yaml: falta o es inválido el campo openapi (versión)");
  process.exit(1);
}

if (doc.paths === null || typeof doc.paths !== "object" || Array.isArray(doc.paths)) {
  console.error("validate-openapi-yaml: falta o es inválido el objeto paths");
  process.exit(1);
}

const n = Object.keys(doc.paths).length;
console.log(`validate-openapi-yaml: OK (OpenAPI ${doc.openapi}, ${n} paths)`);
