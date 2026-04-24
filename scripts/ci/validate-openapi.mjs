#!/usr/bin/env node
/**
 * Valida que docs/openapi-opsly-api.yaml sea YAML parseable y tenga estructura OpenAPI mínima.
 * Uso: node scripts/ci/validate-openapi.mjs
 * (Wrapper en scripts/validate-openapi-yaml.mjs reenvía aquí.)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..", "..");
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

/** Paths portal Zero-Trust que deben permanecer en el subset publicado. */
const REQUIRED_PORTAL_PATHS = [
  "/api/portal/me",
  "/api/portal/mode",
  "/api/portal/usage",
  "/api/portal/billing/summary",
  "/api/portal/health",
  "/api/portal/tenant/{slug}/me",
  "/api/portal/tenant/{slug}/mode",
  "/api/portal/tenant/{slug}/usage",
  "/api/portal/tenant/{slug}/health",
  "/api/portal/tenant/{slug}/budget",
  "/api/portal/tenant/{slug}/subscription/upgrade",
  "/api/portal/tenant/{slug}/insights",
];

for (const p of REQUIRED_PORTAL_PATHS) {
  if (!Object.prototype.hasOwnProperty.call(doc.paths, p)) {
    console.error(
      `validate-openapi-yaml: falta path obligatorio en spec: ${p}`,
    );
    process.exit(1);
  }
}

/** Subset feedback (portal POST + admin GET) — Fase 4 incr. 24. */
const REQUIRED_FEEDBACK_PATHS = ["/api/feedback"];

const REQUIRED_ADMIN_PATHS = ["/api/admin/audit"];

/** Sprint 5: Swagger UI, versioning, webhooks */
const REQUIRED_SPRINT5_PATHS = [
  "/api/docs",
  "/api/v1",
  "/api/tenants/{id}/webhooks",
  "/api/tenants/{id}/webhooks/{webhookId}",
];

for (const p of REQUIRED_FEEDBACK_PATHS) {
  if (!Object.prototype.hasOwnProperty.call(doc.paths, p)) {
    console.error(
      `validate-openapi-yaml: falta path obligatorio en spec: ${p}`,
    );
    process.exit(1);
  }
}

for (const p of REQUIRED_ADMIN_PATHS) {
  if (!Object.prototype.hasOwnProperty.call(doc.paths, p)) {
    console.error(
      `validate-openapi-yaml: falta path obligatorio en spec: ${p}`,
    );
    process.exit(1);
  }
}

for (const p of REQUIRED_SPRINT5_PATHS) {
  if (!Object.prototype.hasOwnProperty.call(doc.paths, p)) {
    console.error(
      `validate-openapi-yaml: falta path sprint5 en spec: ${p}`,
    );
    process.exit(1);
  }
}

const n = Object.keys(doc.paths).length;
console.log(
  `validate-openapi-yaml: OK (OpenAPI ${doc.openapi}, ${n} paths, portal ${REQUIRED_PORTAL_PATHS.length} + feedback ${REQUIRED_FEEDBACK_PATHS.length} + admin ${REQUIRED_ADMIN_PATHS.length} + sprint5 ${REQUIRED_SPRINT5_PATHS.length} requeridos)`,
);
