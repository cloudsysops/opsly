#!/usr/bin/env node
/**
 * Resolve PC-gamer schedule mode from config/pc-gamer-schedule.json.
 * Used by scripts/ops/pc-gamer-schedule.sh and unit tests.
 */

const WEEKDAY_MAP = {
  Mon: 'mon',
  Tue: 'tue',
  Wed: 'wed',
  Thu: 'thu',
  Fri: 'fri',
  Sat: 'sat',
  Sun: 'sun',
};

export function toMinutes(time) {
  const [hours, minutes] = String(time).split(':').map(Number);
  return hours * 60 + minutes;
}

export function resolvePcGamerSchedule(cfg, options = {}) {
  const tz = cfg.timezone || 'America/Bogota';
  const now = options.now instanceof Date ? options.now : new Date();
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(now).map((part) => [part.type, part.value]));
  const day = String(options.day || WEEKDAY_MAP[parts.weekday] || 'mon').toLowerCase();
  const hhmm = options.at || `${parts.hour}:${parts.minute}`;
  const nowMin = toMinutes(hhmm === '24:00' ? '23:59' : hhmm);

  const blocks = cfg.weekly?.[day] || [];
  let block = blocks.find((item) => {
    const start = toMinutes(item.start);
    const end = item.end === '24:00' ? 24 * 60 : toMinutes(item.end);
    return nowMin >= start && nowMin < end;
  });

  if (!block) {
    block = { mode: 'gaming' };
  }

  const modeCfg = cfg.modes?.[block.mode] || {};
  return {
    timezone: tz,
    day,
    time: hhmm,
    mode: block.mode,
    allow_enqueue: modeCfg.allow_enqueue || [],
    deny_enqueue: modeCfg.deny_enqueue || [],
    worker_hint: modeCfg.worker_hint || {},
  };
}

export function modeAllows(resolved, needle) {
  return Array.isArray(resolved.allow_enqueue) && resolved.allow_enqueue.includes(needle);
}

function parseArgs(argv) {
  const out = { json: false, at: '', day: '', config: '' };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--json') out.json = true;
    else if (arg === '--at') out.at = argv[i + 1] || '';
    else if (arg.startsWith('--at=')) out.at = arg.slice(5);
    else if (arg === '--day') out.day = argv[i + 1] || '';
    else if (arg.startsWith('--day=')) out.day = arg.slice(6);
    else if (arg === '--config') out.config = argv[i + 1] || '';
  }
  return out;
}

const invokedDirectly = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (invokedDirectly) {
  const { readFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  const args = parseArgs(process.argv.slice(2));
  const configPath =
    args.config || process.env.PC_GAMER_SCHEDULE_FILE || join(process.cwd(), 'config/pc-gamer-schedule.json');
  const cfg = JSON.parse(readFileSync(configPath, 'utf8'));
  const out = resolvePcGamerSchedule(cfg, {
    at: args.at || undefined,
    day: args.day || undefined,
  });
  if (args.json) {
    process.stdout.write(`${JSON.stringify(out)}\n`);
  } else {
    process.stdout.write(`pc-gamer mode=${out.mode} day=${out.day} time=${out.time} tz=${out.timezone}\n`);
    process.stdout.write(`allow=[${out.allow_enqueue.join(',')}] deny=[${out.deny_enqueue.join(',')}]\n`);
  }
}
