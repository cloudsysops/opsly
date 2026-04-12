#!/usr/bin/env node
/**
 * Actualiza sprints[0].burn_down.series en status.yaml con snapshot diario.
 * Cuenta tareas en YAML (done vs rest) o, si NOTION_TOKEN está, reutiliza notion-to-yaml merge previo.
 */
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const ROOT = path.join(__dirname, "..");
const YAML_PATH = path.join(ROOT, "docs", "implementation", "status.yaml");

function countTasks(tasks) {
  const list = Array.isArray(tasks) ? tasks : [];
  let done = 0;
  let blocked = 0;
  let prog = 0;
  let pend = 0;
  for (const t of list) {
    const s = String(t.status || "");
    if (s.includes("BLOCKED") || s.includes("🔴")) {
      blocked += 1;
    } else if (s.includes("DONE") || s.includes("✅")) {
      done += 1;
    } else if (s.includes("PROGRESS") || s.includes("🚧") || s.includes("IN_PROGRESS")) {
      prog += 1;
    } else {
      pend += 1;
    }
  }
  return { done, blocked, prog, pend, total: list.length };
}

function main() {
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
    console.error("❌ Invalid YAML");
    process.exit(1);
  }
  data.sprints = Array.isArray(data.sprints) ? data.sprints : [];
  let s1 = data.sprints.find((s) => s.number === 1);
  if (!s1) {
    s1 = { number: 1, name: "Sprint 1", status: "IN_PROGRESS" };
    data.sprints.unshift(s1);
  }
  const tasks = Array.isArray(s1.tasks) ? s1.tasks : [];
  const c = countTasks(tasks);
  s1.completed = c.done;
  s1.in_progress = c.prog;
  s1.blocked = c.blocked;
  s1.pending = c.pend;

  const today = new Date().toISOString().slice(0, 10);
  s1.burn_down = s1.burn_down && typeof s1.burn_down === "object" ? s1.burn_down : {};
  s1.burn_down.series = Array.isArray(s1.burn_down.series) ? s1.burn_down.series : [];
  const target = typeof s1.burn_down.target === "number" ? s1.burn_down.target : c.total || 1;
  s1.burn_down.target = target;
  s1.burn_down.actual = c.done;

  const exists = s1.burn_down.series.some((row) => row && row.date === today);
  if (!exists) {
    s1.burn_down.series.push({
      date: today,
      completed: c.done,
      actual: c.done,
      target,
    });
  }

  const body = yaml.dump(data, { lineWidth: 120, noRefs: true, sortKeys: false });
  const prefix = leadingComments.length > 0 ? `${leadingComments.join("\n")}\n` : "";
  fs.writeFileSync(YAML_PATH, `${prefix}${body}`, "utf8");
  console.log(`✅ Burndown updated for ${today}: done=${String(c.done)} / total=${String(c.total)}`);
}

main();
