#!/usr/bin/env node
/**
 * Plantillas Discord (embed) — usa DISCORD_WEBHOOK_URL (no hardcode).
 * Uso: node scripts/discord-notify.js <template> [json-payload]
 * Templates: task_completed, sprint_milestone, burndown, blocker, agent_status
 */
const url = process.env.DISCORD_WEBHOOK_URL?.trim();
if (!url) {
  console.error("❌ DISCORD_WEBHOOK_URL no definido");
  process.exit(1);
}

const template = process.argv[2] || "burndown";
const extra = process.argv[3] ? JSON.parse(process.argv[3]) : {};

function embed(payload) {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

async function main() {
  let body;
  switch (template) {
    case "task_completed":
      body = {
        embeds: [
          {
            title: "✅ Tarea completada",
            description: `${extra.task || "task"} — ${extra.agent || "agent"}`,
            color: 0x2ecc71,
          },
        ],
      };
      break;
    case "sprint_milestone":
      body = {
        embeds: [
          {
            title: "🎯 Sprint",
            description: `${extra.name || "Sprint"}: ${extra.pct || "?"}% (${extra.done || "?"}/${extra.total || "?"})`,
            color: 0x3498db,
          },
        ],
      };
      break;
    case "burndown":
      body = {
        embeds: [
          {
            title: "📊 Burndown",
            description: `Velocity: ${extra.velocity || "n/a"} (target: ${extra.target || "n/a"})`,
            color: 0x9b59b6,
          },
        ],
      };
      break;
    case "blocker":
      body = {
        embeds: [
          {
            title: "🚨 Blocker",
            description: `${extra.title || "—"}\n${extra.fix || ""}`,
            color: 0xe74c3c,
          },
        ],
      };
      break;
    case "agent_status":
      body = {
        embeds: [
          {
            title: "🤖 Agent status",
            description: `${extra.agent || "Agent"}: ${extra.summary || "—"}`,
            color: 0x1abc9c,
          },
        ],
      };
      break;
    default:
      console.error("❌ Unknown template:", template);
      process.exit(1);
  }
  const res = await embed(body);
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Discord ${String(res.status)}: ${t.slice(0, 200)}`);
  }
  console.log("✅ Discord notification sent");
}

main().catch((e) => {
  console.error("❌", e instanceof Error ? e.message : e);
  process.exit(1);
});
