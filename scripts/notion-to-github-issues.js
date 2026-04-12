#!/usr/bin/env node
/**
 * Crea GitHub Issues para filas Notion sin URL de issue (opcional).
 * Env: GITHUB_TOKEN, GITHUB_REPOSITORY (owner/repo), NOTION_* como notion-to-yaml.js
 * Propiedad GitHub Issue: NOTION_PROP_GITHUB_ISSUE (default "GitHub Issue")
 */
const { queryDatabaseAll, getDatabaseId } = require("./lib/notion-http.js");
const { getTitle, getSelect, getRichText, getUrl } = require("./lib/notion-properties.js");

const PROP_NAME = process.env.NOTION_PROP_NAME || "Name";
const PROP_STATUS = process.env.NOTION_PROP_STATUS || "Status";
const PROP_DESC = process.env.NOTION_PROP_DESCRIPTION || "Description";
const PROP_GH = process.env.NOTION_PROP_GITHUB_ISSUE || "GitHub Issue";
const PROP_TYPE = process.env.NOTION_PROP_TYPE || "Type";

function ghAuthHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function createIssue(owner, repo, body) {
  const token = process.env.GITHUB_TOKEN?.trim();
  if (!token) {
    throw new Error("GITHUB_TOKEN no definido");
  }
  const url = `https://api.github.com/repos/${owner}/${repo}/issues`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      ...ghAuthHeaders(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = {};
  }
  if (!res.ok) {
    throw new Error(`GitHub ${String(res.status)}: ${json.message || text.slice(0, 200)}`);
  }
  return json;
}

async function main() {
  const repoFull = process.env.GITHUB_REPOSITORY?.trim();
  if (!repoFull || !repoFull.includes("/")) {
    console.log("⏳ GITHUB_REPOSITORY no definido (owner/repo) — skipping GitHub issue creation.");
    process.exit(0);
  }
  const [owner, repo] = repoFull.split("/");
  const token = process.env.GITHUB_TOKEN?.trim();
  if (!token) {
    console.log("⏳ GITHUB_TOKEN no definido — skipping.");
    process.exit(0);
  }

  const databaseId = getDatabaseId();
  const pages = await queryDatabaseAll(databaseId);
  let created = 0;

  for (const page of pages) {
    const props = page.properties || {};
    const existing = getUrl(props, PROP_GH);
    if (existing && existing.length > 4) {
      continue;
    }
    const title = getTitle(props, PROP_NAME);
    if (!title) {
      continue;
    }
    const desc = getRichText(props, PROP_DESC);
    const typ = getSelect(props, PROP_TYPE) || "task";
    const body = `${desc || "_Sin descripción en Notion._"}\n\n---\n- **Origen:** Notion\n- **Type:** ${typ}`;
    const issue = await createIssue(owner, repo, {
      title: `[${typ}] ${title}`,
      body,
    });
    created += 1;
    console.log(`✅ Created issue #${issue.number}: ${issue.html_url}`);
  }

  console.log(`✅ Created ${String(created)} new GitHub issues (Notion URLs: actualizar en Notion manualmente o vía API).`);
}

main().catch((e) => {
  console.error("❌ notion-to-github-issues:", e instanceof Error ? e.message : e);
  process.exit(1);
});
