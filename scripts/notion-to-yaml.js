#!/usr/bin/env node
/**
 * Notion Tasks → merge en docs/implementation/status.yaml (sprints[].tasks).
 * Requiere NOTION_TOKEN + NOTION_DATABASE_TASKS (o NOTION_DATABASE_ID).
 * Mapeo de columnas vía env (defaults alineados a notion-mcp TASK_PROPS):
 *   NOTION_PROP_NAME=Name, NOTION_PROP_STATUS=Status, NOTION_PROP_SPRINT=Sprint, etc.
 */
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
const { queryDatabaseAll, getDatabaseId } = require("./lib/notion-http.js");
const { getTitle, getRichText, getSelect, getUrl } = require("./lib/notion-properties.js");

const ROOT = path.join(__dirname, "..");
const YAML_PATH = path.join(ROOT, "docs", "implementation", "status.yaml");

const PROP = {
  name: process.env.NOTION_PROP_NAME || "Name",
  status: process.env.NOTION_PROP_STATUS || "Status",
  sprint: process.env.NOTION_PROP_SPRINT || "Sprint",
  type: process.env.NOTION_PROP_TYPE || "Type",
  phase: process.env.NOTION_PROP_PHASE || "Phase",
  assignee: process.env.NOTION_PROP_ASSIGNEE || "Owner",
  effort: process.env.NOTION_PROP_EFFORT || "Effort",
  desc: process.env.NOTION_PROP_DESCRIPTION || "Description",
  ghIssue: process.env.NOTION_PROP_GITHUB_ISSUE || "GitHub Issue",
};

function slugId(name) {
  return String(name || "task")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64) || "task";
}

function peopleNames(prop) {
  if (!prop || prop.type !== "people") {
    return "";
  }
  const people = prop.people || [];
  return people.map((p) => p.name || p.id?.slice(0, 8) || "?").join(", ");
}

function pageToTask(page) {
  const props = page.properties || {};
  const name = getTitle(props, PROP.name) || "Untitled";
  const id = slugId(name);
  return {
    id,
    name,
    type: getSelect(props, PROP.type) || "task",
    status: getSelect(props, PROP.status) || "⏳ PENDING",
    assignee: peopleNames(props[PROP.assignee]) || getRichText(props, PROP.assignee) || "—",
    effort: getSelect(props, PROP.effort) || "M",
    phase: Number.parseInt(String(getSelect(props, PROP.phase) || "1").replace(/\D/g, ""), 10) || 1,
    notion_page_id: page.id,
    github_issue: getUrl(props, PROP.ghIssue) || null,
    description: getRichText(props, PROP.desc).slice(0, 500) || undefined,
  };
}

function main() {
  const run = async () => {
    const databaseId = getDatabaseId();
    const pages = await queryDatabaseAll(databaseId);
    const tasks = pages.map(pageToTask);

    if (!fs.existsSync(YAML_PATH)) {
      console.error("❌ status.yaml not found");
      process.exit(1);
    }
    const raw = fs.readFileSync(YAML_PATH, "utf8");
    const leadingComments = [];
    for (const line of raw.split("\n")) {
      if (line.startsWith("#")) {
        leadingComments.push(line);
      } else if (line.trim() === "") {
        if (leadingComments.length > 0) {
          leadingComments.push(line);
        }
      } else {
        break;
      }
    }
    const data = yaml.load(raw);
    if (!data || typeof data !== "object") {
      console.error("❌ Invalid status.yaml root");
      process.exit(1);
    }

    data.sprints = Array.isArray(data.sprints) ? data.sprints : [];
    let s1 = data.sprints.find((s) => s.number === 1);
    if (!s1) {
      s1 = { number: 1, name: "Sprint 1", status: "IN_PROGRESS", tasks: [] };
      data.sprints.unshift(s1);
    }
    s1.tasks = tasks;
    s1.notion_task_count = tasks.length;
    s1.notion_synced_at = new Date().toISOString();

    const body = yaml.dump(data, { lineWidth: 120, noRefs: true, sortKeys: false });
    const prefix = leadingComments.length > 0 ? `${leadingComments.join("\n")}\n` : "";
    fs.writeFileSync(YAML_PATH, `${prefix}${body}`, "utf8");
    console.log(`✅ Merged ${String(tasks.length)} Notion tasks into status.yaml (sprints[0].tasks)`);
  };

  run().catch((e) => {
    console.error("❌ notion-to-yaml:", e instanceof Error ? e.message : e);
    process.exit(1);
  });
}

main();
