#!/usr/bin/env node
/**
 * Peskids production change-window gate (America/Bogota night).
 * Exit 0 = allowed; exit 1 = blocked.
 *
 * Policy:
 * - Changes that directly touch Peskids or shared runtime surfaces that can affect
 *   Peskids require the night window (or an explicit override).
 * - Changes outside the Peskids production blast radius may merge during daytime
 *   when normal CI/review gates pass.
 *
 * Usage:
 *   node scripts/ci/check-production-change-window.mjs --check-now
 *   node scripts/ci/check-production-change-window.mjs --paths apps/peskids/x.ts docs/a.md
 *   node scripts/ci/check-production-change-window.mjs --mode deploy [--force]
 *   FORCE_DAYTIME=1 | HOTFIX_PROD=1 | SAFE_DAYTIME=1 | NIGHT_MERGE=1 (env overrides for CI)
 *   NIGHT_MERGE=1 only relaxes PR checks (queue for 01:00 bot); never deploy.
 */
'use strict';

const TIME_ZONE = 'America/Bogota';
const WINDOW_START_HOUR = 22; // inclusive
const WINDOW_END_HOUR = 6; // exclusive

/**
 * Direct Peskids runtime surfaces.
 *
 * Keep this list intentionally explicit. The old policy treated almost every
 * app/package/script as production-impact, which blocked unrelated Opsly agent,
 * tooling, documentation, and internal-platform changes during the day.
 */
const PESKIDS_DIRECT_PREFIXES = [
  'apps/peskids/',
  'apps/peskids-franchise/',
];

const PESKIDS_DIRECT_MATCHERS = [
  /^scripts\/peskids/i,
  /^\.github\/workflows\/(deploy-peskids|peskids-|setup-peskids)/i,
];

/**
 * Shared runtime surfaces with a plausible Peskids blast radius.
 *
 * These stay conservative: API/database/infrastructure/dependency changes can
 * affect Peskids even when the path does not contain "peskids".
 */
const PESKIDS_SHARED_PREFIXES = [
  'apps/api/',
  'infra/',
  'supabase/',
  'packages/',
  'lib/',
];

const PESKIDS_SHARED_MATCHERS = [
  /^\.github\/workflows\/deploy/i,
  /^scripts\/.*deploy/i,
  /^scripts\/vps-/i,
  /^scripts\/onboard-/i,
  /^package\.json$/,
  /^package-lock\.json$/,
];

function bogotaParts(date = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    hour: 'numeric',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(date).filter((p) => p.type !== 'literal').map((p) => [p.type, p.value])
  );
  const hour = Number(parts.hour === '24' ? '0' : parts.hour);
  return { hour, stamp: `${parts.year}-${parts.month}-${parts.day} ${String(hour).padStart(2, '0')}:xx ${TIME_ZONE}` };
}

function isNightWindow(date = new Date()) {
  const { hour } = bogotaParts(date);
  return hour >= WINDOW_START_HOUR || hour < WINDOW_END_HOUR;
}

function normalizePath(p) {
  return String(p || '')
    .trim()
    .replace(/^\.\//, '')
    .replace(/\\/g, '/');
}

function matchesAny(path, prefixes, matchers) {
  const p = normalizePath(path);
  if (!p) return false;
  if (prefixes.some((prefix) => p.startsWith(prefix))) return true;
  return matchers.some((re) => re.test(p));
}

function classifyPeskidsImpact(paths) {
  const normalized = [...new Set(paths.map(normalizePath).filter(Boolean))];
  const direct = normalized.filter((p) =>
    matchesAny(p, PESKIDS_DIRECT_PREFIXES, PESKIDS_DIRECT_MATCHERS)
  );
  const shared = normalized.filter((p) =>
    matchesAny(p, PESKIDS_SHARED_PREFIXES, PESKIDS_SHARED_MATCHERS)
  );
  const impact = [...new Set([...direct, ...shared])];
  return {
    normalized,
    direct,
    shared,
    impact,
    hasPeskidsImpact: impact.length > 0,
  };
}

function truthy(v) {
  if (v == null) return false;
  const s = String(v).trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'yes' || s === 'on';
}

function parseArgs(argv) {
  const out = {
    checkNow: false,
    mode: 'pr',
    force: false,
    paths: [],
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--check-now') out.checkNow = true;
    else if (a === '--force') out.force = true;
    else if (a === '--mode') {
      out.mode = argv[i + 1] || 'pr';
      i += 1;
    } else if (a === '--paths') {
      while (i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
        out.paths.push(argv[i + 1]);
        i += 1;
      }
    } else if (!a.startsWith('-')) {
      out.paths.push(a);
    }
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const night = isNightWindow();
  const { stamp } = bogotaParts();
  const nightMergeQueued = truthy(process.env.NIGHT_MERGE);
  const force =
    args.force ||
    truthy(process.env.FORCE_DAYTIME) ||
    truthy(process.env.HOTFIX_PROD) ||
    truthy(process.env.SAFE_DAYTIME);

  if (args.checkNow) {
    console.log(
      JSON.stringify(
        {
          timezone: TIME_ZONE,
          window: `${WINDOW_START_HOUR}:00–${WINDOW_END_HOUR}:00`,
          now: stamp,
          in_night_window: night,
        },
        null,
        2
      )
    );
    process.exit(night ? 0 : 1);
  }

  if (args.mode === 'deploy') {
    if (night || force) {
      console.log(
        `ok deploy window (${stamp})${force && !night ? ' [forced daytime]' : ''}`
      );
      process.exit(0);
    }
    console.error(
      [
        `❌ Deploy bloqueado fuera de ventana nocturna (${TIME_ZONE} ${WINDOW_START_HOUR}:00–${WINDOW_END_HOUR}:00).`,
        `   Ahora: ${stamp}`,
        `   Reintentar después de las ${WINDOW_START_HOUR}:00, o workflow_dispatch con force_daytime=true / label hotfix-prod.`,
        `   Política: docs/runbooks/PRODUCTION-CHANGE-WINDOW.md`,
      ].join('\n')
    );
    process.exit(1);
  }

  const { hasPeskidsImpact, impact, direct, shared, normalized } =
    classifyPeskidsImpact(args.paths);

  if (!hasPeskidsImpact) {
    console.log(
      `ok daytime merge: no Peskids production impact detected (${normalized.length} files)`
    );
    process.exit(0);
  }

  if (night || force || nightMergeQueued) {
    const tag = nightMergeQueued && !night && !force
      ? ' [night-merge queue — merge deferred to 01:00 Bogotá]'
      : force && !night
        ? ' [label/force]'
        : '';
    console.log(
      `ok Peskids-impact PR (${stamp})${tag} impact=${impact.length} direct=${direct.length} shared=${shared.length}`
    );
    process.exit(0);
  }

  console.error(
    [
      `❌ Merge con posible impacto Peskids bloqueado de día.`,
      `   Zona: ${TIME_ZONE} | Ventana permitida: ${WINDOW_START_HOUR}:00–${WINDOW_END_HOUR}:00 | Ahora: ${stamp}`,
      `   Paths de impacto (muestra): ${impact.slice(0, 12).join(', ')}`,
      `   Opciones:`,
      `   1) Label night-merge (CI puede quedar verde; merge diferido a la noche)`,
      `   2) Esperar a la noche y mergear entonces`,
      `   3) Label safe-daytime SOLO si un reviewer confirma que el cambio no puede afectar Peskids`,
      `   4) Label hotfix-prod solo para emergencia`,
      `   Doc: docs/runbooks/PRODUCTION-CHANGE-WINDOW.md`,
    ].join('\n')
  );
  process.exit(1);
}

main();
