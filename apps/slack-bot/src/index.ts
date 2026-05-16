import { createServer } from "node:http";
import {
  App,
  type BlockAction,
  type ButtonAction,
  type SlackCommandMiddlewareArgs,
} from "@slack/bolt";
import axios from "axios";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.mcp" });

const DEFAULT_SLACK_PORT = 3010;

function parsePort(rawValue: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(rawValue ?? String(fallback), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const SLACK_PORT = parsePort(process.env.SLACK_PORT, DEFAULT_SLACK_PORT);

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

const HERMES_API = process.env.HERMES_API_URL || "http://localhost:3001";
const INVITATIONS_API =
  process.env.HERMES_INVITATIONS_URL || "http://localhost:3003";

// ════════════════════════════════════════════════════════════════════
// EVENTS: App Home (Dashboard)
// ════════════════════════════════════════════════════════════════════

app.event(
  "app_home_opened",
  async ({ event, client }: { event: { user: string }; client: typeof app.client }) => {
  try {
    const homeView = buildHomeView();
    await client.views.publish({
      user_id: event.user,
      view: homeView,
    });
  } catch (error) {
    console.error("Error publishing home view:", error);
  }
  }
);

// ════════════════════════════════════════════════════════════════════
// COMMANDS: /hermes-status
// ════════════════════════════════════════════════════════════════════

app.command("/hermes-status", async ({ command, ack, say }: SlackCommandMiddlewareArgs) => {
  await ack();

  try {
    const response = await axios.get(`${HERMES_API}/health`);
    const { status, services } = response.data;

    const blocks = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Hermes Status* — ${status === "ok" ? "✅ HEALTHY" : "🔴 UNHEALTHY"}`,
        },
      },
      { type: "divider" },
    ];

    // Add service status
    Object.entries(services || {}).forEach(([service, health]: [string, any]) => {
      const icon = health.status === "up" ? "✅" : "🔴";
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `${icon} *${service}*\nStatus: ${health.status} | Uptime: ${health.uptime_seconds}s`,
        },
      });
    });

    blocks.push({ type: "divider" });
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: "View full dashboard: <http://localhost:3000|Grafana>",
      },
    });

    await say({ blocks });
  } catch (error) {
    await say(`❌ Error fetching status: ${error}`);
  }
});

// ════════════════════════════════════════════════════════════════════
// COMMANDS: /hermes-invite <email> <tenant>
// ════════════════════════════════════════════════════════════════════

app.command("/hermes-invite", async ({ command, ack, say, body }: SlackCommandMiddlewareArgs) => {
  await ack();

  const [email, tenantName] = command.text.split(" ");

  if (!email || !tenantName) {
    await say("Usage: `/hermes-invite email@example.com tenant-name`");
    return;
  }

  try {
    const response = await axios.post(`${INVITATIONS_API}/api/invitations`, {
      tenant_name: tenantName,
      tenant_email: email,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const { token } = response.data;

    await say({
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `✅ *Invitation created for ${tenantName}*\n\nEmail: \`${email}\`\nToken: \`${token.substring(0, 16)}...\`\nExpires: 7 days`,
          },
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: { type: "plain_text", text: "View in Dashboard" },
              url: "http://localhost:3003",
              action_id: "btn_view_invitations",
            },
            {
              type: "button",
              text: { type: "plain_text", text: "Copy Token" },
              action_id: "btn_copy_token",
              value: token,
            },
          ],
        },
      ],
    });

    console.log(`[SLACK] Invitation created: ${tenantName} (${email})`);
  } catch (error) {
    await say(`❌ Error creating invitation: ${error}`);
  }
});

// ════════════════════════════════════════════════════════════════════
// COMMANDS: /hermes-task <agent> <description>
// ════════════════════════════════════════════════════════════════════

app.command("/hermes-task", async ({ command, ack, say, body }: SlackCommandMiddlewareArgs) => {
  await ack();

  const parts = command.text.match(/"([^"]*)"|(\S+)/g) || [];
  const agent = parts[0]?.replace(/"/g, "");
  const description = parts.slice(1).join(" ").replace(/"/g, "");

  if (!agent || !description) {
    await say(
      'Usage: `/hermes-task architect "design database schema for user profiles"`'
    );
    return;
  }

  try {
    const response = await axios.post(`${HERMES_API}/api/tasks/queue`, {
      agent_type: agent,
      task_description: description,
      requested_by: body.user_id,
      requested_from: "slack",
    });

    const { task_id, status } = response.data;

    await say({
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `✅ *Task queued for ${agent} agent*\n\nTask ID: \`${task_id}\`\nStatus: ${status}`,
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `📝 *Description:*\n${description}`,
          },
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: { type: "plain_text", text: "Check Status" },
              action_id: "btn_task_status",
              value: task_id,
            },
            {
              type: "button",
              text: { type: "plain_text", text: "View in Dashboard" },
              url: "http://localhost:3000?task=" + task_id,
              action_id: "btn_view_task",
            },
          ],
        },
      ],
    });

    console.log(`[SLACK] Task queued: ${task_id} for ${agent}`);
  } catch (error) {
    await say(`❌ Error queueing task: ${error}`);
  }
});

// ════════════════════════════════════════════════════════════════════
// ACTIONS: Button clicks
// ════════════════════════════════════════════════════════════════════

app.action(
  "btn_task_status",
  async (args) => {
    const {
      ack,
      action,
      client,
      body,
    } = args as unknown as {
      ack: () => Promise<void>;
      action: ButtonAction;
      client: typeof app.client;
      body: { user: { id: string } };
    };

    await ack();

    const taskId = (action as ButtonAction).value;

    try {
      const response = await axios.get(`${HERMES_API}/api/tasks/${taskId}`);
      const { status, started_at, completed_at, result } = response.data;

      const blocks = [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Task Status: ${status.toUpperCase()}*\nID: \`${taskId}\``,
          },
        },
      ];

      if (started_at) {
        blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `⏱️ Started: ${new Date(started_at).toLocaleString()}`,
          },
        });
      }

      if (completed_at) {
        blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `✅ Completed: ${new Date(completed_at).toLocaleString()}`,
          },
        });
      }

      if (result) {
        blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `📋 Result:\n\`\`\`\n${JSON.stringify(result, null, 2)}\n\`\`\``,
          },
        });
      }

      await client.chat.postMessage({
        channel: body.user.id,
        blocks,
        text: `Task status: ${status.toUpperCase()} (${taskId})`,
      });
    } catch (error) {
      await client.chat.postMessage({
        channel: body.user.id,
        text: `❌ Error fetching task status: ${error}`,
      });
    }
  }
);

// ════════════════════════════════════════════════════════════════════
// HOME VIEW: Build dashboard
// ════════════════════════════════════════════════════════════════════

function buildHomeView() {
  const homeView = {
    type: "home",
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "🤖 Hermes Agent Platform",
          emoji: true,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "Welcome to Hermes! Control your autonomous agents from Slack.\n\n*Quick Actions:*",
        },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "📊 System Status" },
            action_id: "btn_show_status",
            value: "status",
          },
          {
            type: "button",
            text: { type: "plain_text", text: "📧 Invite Tenant" },
            action_id: "btn_show_invite_modal",
            value: "invite",
          },
          {
            type: "button",
            text: { type: "plain_text", text: "➕ Queue Task" },
            action_id: "btn_show_task_modal",
            value: "task",
          },
          {
            type: "button",
            text: { type: "plain_text", text: "📈 View Dashboard" },
            url: "http://localhost:3000",
            action_id: "btn_open_grafana",
          },
        ],
      },
      { type: "divider" },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*Commands:*\n`/hermes-status` — Check service health\n`/hermes-invite email@example.com tenant-name` — Invite new tenant\n`/hermes-task agent \"task description\"` — Queue task for agent",
        },
      },
      { type: "divider" },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: "Last updated: <!date^{ts}^{date} at {time} {tz}|{ts_fallback}>",
          },
        ],
      },
    ],
  };

  return homeView as Parameters<typeof app.client.views.publish>[0]["view"];
}

function startHealthServer(): void {
  const server = createServer((req, res) => {
    const host = req.headers.host ?? "127.0.0.1";
    const url = new URL(req.url ?? "/", `http://${host}`);

    if (req.method === "GET" && url.pathname === "/health") {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ status: "ok", service: "slack-bot" }));
      return;
    }

    res.writeHead(404);
    res.end();
  });

  server.listen(SLACK_PORT, "0.0.0.0", () => {
    console.log(
      JSON.stringify({
        service: "slack-bot",
        http: "listening",
        port: SLACK_PORT,
        path: "/health",
      })
    );
  });
}

// ════════════════════════════════════════════════════════════════════
// START APP
// ════════════════════════════════════════════════════════════════════

(async () => {
  try {
    startHealthServer();
    await app.start();
    console.log("✅ Hermes Slack Bot started successfully");
    console.log(`   Health: http://0.0.0.0:${SLACK_PORT}/health`);
    console.log(`   API: ${HERMES_API}`);
  } catch (error) {
    console.error("❌ Failed to start bot:", error);
    process.exit(1);
  }
})();

export default app;
