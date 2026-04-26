/**
 * Cliente mínimo Notion API (fetch) — sin secretos en logs.
 * @see https://developers.notion.com/reference
 */
const NOTION_VERSION = process.env.NOTION_API_VERSION || '2022-06-28';

function getToken() {
  const t = process.env.NOTION_TOKEN?.trim();
  if (!t) {
    throw new Error('NOTION_TOKEN no definido');
  }
  return t;
}

function getDatabaseId() {
  const id = process.env.NOTION_DATABASE_ID?.trim() || process.env.NOTION_DATABASE_TASKS?.trim();
  if (!id) {
    throw new Error('NOTION_DATABASE_TASKS o NOTION_DATABASE_ID no definido');
  }
  return id.replace(/-/g, '');
}

async function notionFetch(path, options = {}) {
  const url = path.startsWith('http') ? path : `https://api.notion.com/v1${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${getToken()}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }
  if (!res.ok) {
    const msg = body.message || body.code || res.statusText || 'Notion API error';
    throw new Error(`Notion ${String(res.status)}: ${msg}`);
  }
  return body;
}

async function retrieveDatabase(databaseId) {
  const id = databaseId.replace(/-/g, '');
  return notionFetch(`/databases/${id}`);
}

async function queryDatabase(databaseId, body = {}) {
  const id = databaseId.replace(/-/g, '');
  return notionFetch(`/databases/${id}/query`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

async function queryDatabaseAll(databaseId) {
  let cursor;
  const pages = [];
  do {
    const payload = { page_size: 100 };
    if (cursor) {
      payload.start_cursor = cursor;
    }
    const res = await queryDatabase(databaseId, payload);
    for (const r of res.results || []) {
      pages.push(r);
    }
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return pages;
}

module.exports = {
  getToken,
  getDatabaseId,
  retrieveDatabase,
  queryDatabase,
  queryDatabaseAll,
  NOTION_VERSION,
};
