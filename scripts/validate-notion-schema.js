#!/usr/bin/env node
/**
 * Valida que la base Notion (Tasks por defecto) tenga las propiedades esperadas.
 * Env: NOTION_TOKEN, NOTION_DATABASE_TASKS o NOTION_DATABASE_ID
 * Opcional: NOTION_SCHEMA_STRICT=true para lista extendida
 */
const { retrieveDatabase, getDatabaseId } = require("./lib/notion-http.js");

/** Mínimo alineado a apps/notion-mcp TASK_PROPS + campos útiles sync */
const REQUIRED = [
  { name: "Name", types: ["title"] },
  { name: "Status", types: ["select", "status"] },
  { name: "Sprint", types: ["select", "relation", "rich_text"] },
];

const EXTENDED = [
  { name: "Type", types: ["select", "multi_select"] },
  { name: "Phase", types: ["select"] },
  { name: "Priority", types: ["select"] },
  { name: "Owner", types: ["people"] },
  { name: "Description", types: ["rich_text"] },
  { name: "GitHub Issue", types: ["url"] },
  { name: "GitHub PR", types: ["url"] },
  { name: "Blocker", types: ["checkbox"] },
];

function validateProps(properties, rules, label) {
  let ok = true;
  for (const rule of rules) {
    const p = properties[rule.name];
    if (!p) {
      console.error(`❌ Missing property: ${rule.name} (expected one of types: ${rule.types.join(", ")}) [${label}]`);
      ok = false;
      continue;
    }
    if (!rule.types.includes(p.type)) {
      console.error(
        `❌ Wrong type for ${rule.name}: got "${p.type}", expected one of: ${rule.types.join(", ")} [${label}]`,
      );
      ok = false;
    }
  }
  return ok;
}

async function main() {
  const strict = process.env.NOTION_SCHEMA_STRICT === "true";
  try {
    const id = getDatabaseId();
    const db = await retrieveDatabase(id);
    const props = db.properties || {};
    console.log(`✅ Fetched Notion database schema (${Object.keys(props).length} properties)`);

    let ok = validateProps(props, REQUIRED, "required");
    if (strict) {
      ok = validateProps(props, EXTENDED, "extended") && ok;
    } else {
      console.log("ℹ️  Extended schema not enforced (set NOTION_SCHEMA_STRICT=true for strict check)");
    }

    if (!ok) {
      process.exit(1);
    }
    console.log("✅ Notion schema valid");
    process.exit(0);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("❌ validate-notion-schema:", msg);
    process.exit(1);
  }
}

main();
