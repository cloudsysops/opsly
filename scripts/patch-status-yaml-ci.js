#!/usr/bin/env node
/**
 * CI: actualiza last_commit y last_updated en docs/implementation/status.yaml
 * Variables: GITHUB_SHA (completo o vacío), opcional SHORT_SHA=7 chars
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const YAML_PATH = path.join(ROOT, "docs", "implementation", "status.yaml");

function main() {
  if (!fs.existsSync(YAML_PATH)) {
    console.error("patch-status-yaml-ci: status.yaml not found");
    process.exit(1);
  }
  const sha = process.env.GITHUB_SHA || "";
  const short = sha.length >= 7 ? sha.slice(0, 7) : sha || "unknown";
  const iso = new Date().toISOString();
  let s = fs.readFileSync(YAML_PATH, "utf8");
  s = s.replace(/^last_commit:\s*.+$/m, `last_commit: ${short}`);
  s = s.replace(/^last_updated:\s*.+$/m, `last_updated: "${iso}"`);
  fs.writeFileSync(YAML_PATH, s, "utf8");
  console.log(`✅ Patched status.yaml: last_commit=${short}, last_updated=${iso}`);
}

main();
