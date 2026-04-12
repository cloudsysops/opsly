#!/usr/bin/env node
/**
 * Ejecuta validación Notion + fetch + GitHub issues solo si hay tokens (sin fallar en local).
 */
const { execSync } = require("child_process");

function run(cmd) {
  console.log(`\n▶ ${cmd}`);
  execSync(cmd, { stdio: "inherit", shell: true });
}

function main() {
  console.log("✅ Paso docs:sync completado en la cadena npm run sync:all.");
  if (process.env.NOTION_TOKEN?.trim()) {
    try {
      run("npm run notion:validate");
    } catch {
      console.warn("⚠️  notion:validate failed — revisar schema Notion");
    }
    try {
      run("npm run notion:fetch");
    } catch {
      console.warn("⚠️  notion:fetch failed");
    }
  } else {
    console.log("⏳ NOTION_TOKEN ausente — omitiendo notion:validate / notion:fetch");
  }
  if (process.env.GITHUB_TOKEN?.trim() && process.env.GITHUB_REPOSITORY?.includes("/")) {
    try {
      run("npm run github:sync-issues");
    } catch {
      console.warn("⚠️  github:sync-issues failed");
    }
  } else {
    console.log("⏳ GITHUB_TOKEN / GITHUB_REPOSITORY ausente — omitiendo github:sync-issues");
  }
  console.log("\n✅ sync:all orchestrator finished");
}

main();
