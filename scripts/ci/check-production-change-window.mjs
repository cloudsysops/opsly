#!/usr/bin/env node
/**
 * Production change window gate (America/Bogota night).
 * Exit 0 = allowed; exit 1 = blocked.
 *
 * Usage:
 *   node scripts/ci/check-production-change-window.mjs --check-now
 *   node scripts/ci/check-production-change-window.mjs --paths apps/peskids/x.ts docs/a.md
 *   node scripts/ci/check-production-change-window.mjs --mode deploy [--force]
 *   FORCE_DAYTIME=1 | HOTFIX_PROD=1 | SAFE_DAYTIME=1 | NIGHT_MERGE=1 (env overrides for CI)
 *   NIGHT_MERGE=1 only relaxes PR checks (queue for 01:00 bot); never deploy.
 */
'use strict';

import { classifyChangeImpact } from './change-impact.mjs';

const TIME_ZONE = 'America/Bogota';
const WINDOW_START_HOUR = 22; // inclusive
const WINDOW_END_HOUR = 6; // exclusive

// Per docs/runbooks/PRODUCTION-CHANGE-WINDOW.md, the night window gates
// Peskids specifically (its deploy/release surface is what the window
// protects). Platform/Content/Games/Health-Travel/shared-runtime changes are
// `merge:daytime`-eligible and must not be blocked by this gate — reuse the
// canonical classifier (scripts/ci/change-impact.mjs) instead of maintaining
// a second, broader prefix list here.
const WINDOWED_DOMAINS = new Set(['peskids']);

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

function classifyPaths(paths) {
  const normalized = [...new Set(paths.map(normalizePath).filter(Boolean))];
  const impact = classifyChangeImpact(normalized);
  const windowed = impact.domains.some((domain) => WINDOWED_DOMAINS.has(domain));
  // Only the windowed domains (currently: peskids) require the night window.
  // Everything else classifies as merge:daytime-eligible per the canonical
  // classifier and is not blocked here.
  const prod = windowed ? normalized : [];
  return { normalized, prod, unsafe: [], hasImpact: windowed, impact };
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
      // remaining until next flag
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

  // PR mode
  const { hasImpact, prod, normalized } = classifyPaths(args.paths);
  if (!hasImpact) {
    console.log(`ok merge:daytime-eligible paths only (${normalized.length} files)`);
    process.exit(0);
  }

  if (night || force || nightMergeQueued) {
    const tag = nightMergeQueued && !night && !force
      ? ' [night-merge queue — merge deferred to 01:00 Bogotá]'
      : force && !night
        ? ' [label/force]'
        : '';
    console.log(
      `ok peskids-impact PR (${stamp})${tag} impact=${prod.length}`
    );
    process.exit(0);
  }

  console.error(
    [
      `❌ Merge/deploy de Peskids bloqueado de día.`,
      `   Zona: ${TIME_ZONE} | Ventana permitida: ${WINDOW_START_HOUR}:00–${WINDOW_END_HOUR}:00 | Ahora: ${stamp}`,
      `   Paths de impacto (muestra): ${prod.slice(0, 12).join(', ')}`,
      `   Opciones:`,
      `   1) Label night-merge (CI verde de día; merge automático a la 01:00 Bogotá)`,
      `   2) Esperar a la noche y mergear entonces`,
      `   3) Label safe-daytime si el cambio NO afecta prod/ops`,
      `   4) Label hotfix-prod solo para emergencia`,
      `   Doc: docs/runbooks/PRODUCTION-CHANGE-WINDOW.md`,
    ].join('\n')
  );
  process.exit(1);
}

main();
