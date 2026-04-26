#!/usr/bin/env node
/**
 * Sube estadísticas LLM de los últimos 7 días a NotebookLM como fuente.
 * Requiere: NOTEBOOKLM_ENABLED=true, NOTEBOOKLM_NOTEBOOK_ID, Redis con usage_events.
 * Ejecutar: node scripts/llm-stats-to-notebooklm.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from 'redis';

import { executeNotebookLM } from '@intcloudsysops/notebooklm-agent';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

async function getLLMStats() {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    return null;
  }

  const client = createClient({ url: redisUrl });
  await client.connect();

  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const stats = {
    total_calls: 0,
    total_tokens: 0,
    total_cost_usd: 0,
    cache_hit_rate: 0,
    by_tenant: {},
    by_model: {},
    daily: [],
  };

  try {
    const dailyKeys = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(now - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      dailyKeys.push(`usage_events:${date}`);
    }

    for (const key of dailyKeys) {
      const data = await client.lRange(key, 0, -1);
      for (const entry of data) {
        try {
          const e = JSON.parse(entry);
          stats.total_calls++;
          stats.total_tokens += e.tokens || 0;
          stats.total_cost_usd += e.cost_usd || 0;

          const tenant = e.tenant_slug || 'unknown';
          if (!stats.by_tenant[tenant]) {
            stats.by_tenant[tenant] = { calls: 0, cost: 0 };
          }
          stats.by_tenant[tenant].calls++;
          stats.by_tenant[tenant].cost += e.cost_usd || 0;

          const model = e.model || 'unknown';
          if (!stats.by_model[model]) {
            stats.by_model[model] = { calls: 0, cost: 0 };
          }
          stats.by_model[model].calls++;
          stats.by_model[model].cost += e.cost_usd || 0;

          const dayIndex = dailyKeys.indexOf(key);
          if (!stats.daily[dayIndex]) {
            stats.daily[dayIndex] = { date: key.split(':')[1], calls: 0, cost: 0 };
          }
          stats.daily[dayIndex].calls++;
          stats.daily[dayIndex].cost += e.cost_usd || 0;
        } catch {
          // Skip invalid entries
        }
      }
    }

    if (stats.total_calls > 0) {
      const cachedCalls = (await client.sCard('cached_llm_calls')) || 0;
      stats.cache_hit_rate = Math.round((cachedCalls / stats.total_calls) * 100);
    }
  } finally {
    await client.quit();
  }

  return stats;
}

async function formatAsMarkdown(stats) {
  const lines = ['# Stats LLM - Últimos 7 Días', ''];
  lines.push(`**Total llamadas:** ${stats.total_calls.toLocaleString()}`);
  lines.push(`**Total tokens:** ${stats.total_tokens.toLocaleString()}`);
  lines.push(`**Costo total:** $${stats.total_cost_usd.toFixed(4)}`);
  lines.push(`**Cache hit rate:** ${stats.cache_hit_rate}%`);
  lines.push('');

  if (stats.daily.length) {
    lines.push('### Por Día');
    lines.push('| Fecha | Llamadas | Costo |');
    lines.push('|-------|----------|-------|');
    for (const d of stats.daily.reverse()) {
      lines.push(`| ${d.date} | ${d.calls.toLocaleString()} | $${d.cost.toFixed(4)} |`);
    }
    lines.push('');
  }

  if (Object.keys(stats.by_tenant).length) {
    lines.push('### Por Tenant');
    lines.push('| Tenant | Llamadas | Costo |');
    lines.push('|--------|----------|-------|');
    for (const [t, v] of Object.entries(stats.by_tenant)) {
      lines.push(`| ${t} | ${v.calls.toLocaleString()} | $${v.cost.toFixed(4)} |`);
    }
    lines.push('');
  }

  if (Object.keys(stats.by_model).length) {
    lines.push('### Por Modelo');
    lines.push('| Modelo | Llamadas | Costo |');
    lines.push('|--------|----------|-------|');
    for (const [m, v] of Object.entries(stats.by_model)) {
      lines.push(`| ${m} | ${v.calls.toLocaleString()} | $${v.cost.toFixed(4)} |`);
    }
  }

  return lines.join('\n');
}

async function main() {
  const nb = process.env.NOTEBOOKLM_NOTEBOOK_ID?.trim();
  if (process.env.NOTEBOOKLM_ENABLED?.trim().toLowerCase() !== 'true' || !nb) {
    process.stderr.write('Skip: NOTEBOOKLM_ENABLED o NOTEBOOKLM_NOTEBOOK_ID no configurados.\n');
    process.exit(0);
  }

  const stats = await getLLMStats();
  if (!stats) {
    process.stdout.write('Skip: REDIS_URL no configurado, sin stats.\n');
    process.exit(0);
  }

  const markdown = await formatAsMarkdown(stats);

  try {
    const result = await executeNotebookLM({
      action: 'add_source',
      tenant_slug: process.env.NOTEBOOKLM_DEFAULT_TENANT_SLUG?.trim() || 'platform',
      notebook_id: nb,
      source_type: 'text',
      title: 'llm_stats_7days',
      text: markdown,
    });

    if (result.success) {
      process.stdout.write(
        `✅ LLM stats synced: ${stats.total_calls} calls, $${stats.total_cost_usd.toFixed(4)}\n`
      );
    } else {
      process.stderr.write(`FAIL: ${result.error ?? 'unknown'}\n`);
      process.exit(1);
    }
  } catch (e) {
    process.stderr.write(`ERR: ${e instanceof Error ? e.message : String(e)}\n`);
    process.exit(1);
  }
}

await main();
