import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  bogotaParts,
  isNightWindow,
  classifyPaths,
  parseArgs,
} from '../check-production-change-window.mjs';

// America/Bogota is UTC-5 year-round (no DST), so these UTC instants map directly.
function bogota(hour, minute = 0) {
  const utcHour = (hour + 5) % 24;
  const dayOffset = hour + 5 >= 24 ? 1 : 0;
  return new Date(Date.UTC(2026, 8, 14 + dayOffset, utcHour, minute));
}

describe('bogotaParts', () => {
  it('reads the hour in America/Bogota regardless of the machine timezone', () => {
    assert.equal(bogotaParts(bogota(1, 30)).hour, 1);
    assert.equal(bogotaParts(bogota(23, 0)).hour, 23);
    assert.equal(bogotaParts(bogota(0, 0)).hour, 0);
  });
});

describe('isNightWindow: strict default (22:00-06:00)', () => {
  it('is inside the window late at night', () => {
    assert.equal(isNightWindow(bogota(23, 0)), true);
    assert.equal(isNightWindow(bogota(1, 0)), true);
  });

  it('is inside the window right at the boundaries (start inclusive, end exclusive)', () => {
    assert.equal(isNightWindow(bogota(22, 0)), true);
    assert.equal(isNightWindow(bogota(5, 59)), true);
    assert.equal(isNightWindow(bogota(6, 0)), false);
  });

  it('is outside the window during the day', () => {
    assert.equal(isNightWindow(bogota(10, 48)), false);
    assert.equal(isNightWindow(bogota(21, 59)), false);
  });
});

describe('isNightWindow: grace-extended end hour (the #1548 fix)', () => {
  it('covers the exact failure this was built for — a schedule run delayed past 06:00 but before the grace hour', () => {
    // Real incident: cron fires 06:00 UTC (01:00 Bogota), Actions delayed it to
    // 06:21 Bogota — 21 minutes past the strict window's close.
    assert.equal(isNightWindow(bogota(6, 21)), false, 'sanity: strict window correctly misses this');
    assert.equal(isNightWindow(bogota(6, 21), 9), true, 'grace-until-9 should cover it');
  });

  it('still closes at the grace hour, not indefinitely', () => {
    assert.equal(isNightWindow(bogota(8, 59), 9), true);
    assert.equal(isNightWindow(bogota(9, 0), 9), false);
    assert.equal(isNightWindow(bogota(14, 0), 9), false, 'a multi-hour delay into the afternoon must not be covered');
  });

  it('never narrows the window — grace hour below the default end hour still uses the wider of the two implicitly via the caller default', () => {
    // isNightWindow itself just takes whatever endHour it's given; the "never narrows"
    // guarantee lives in the caller (only --check-now accepts --grace-until-hour, and
    // only night-merge.yml's schedule branch passes one, always >= WINDOW_END_HOUR).
    assert.equal(isNightWindow(bogota(6, 0), 6), false);
  });
});

describe('parseArgs: --grace-until-hour', () => {
  it('defaults to null (no grace) when not passed', () => {
    assert.equal(parseArgs(['--check-now']).graceUntilHour, null);
  });

  it('parses a valid hour', () => {
    assert.equal(parseArgs(['--check-now', '--grace-until-hour', '9']).graceUntilHour, 9);
  });

  it('rejects an out-of-range hour', () => {
    assert.throws(() => parseArgs(['--check-now', '--grace-until-hour', '24']), /0-23/);
    assert.throws(() => parseArgs(['--check-now', '--grace-until-hour', '-1']), /0-23/);
  });

  it('rejects a non-numeric hour', () => {
    assert.throws(() => parseArgs(['--check-now', '--grace-until-hour', 'nope']), /0-23/);
  });

  it('does not affect --paths parsing', () => {
    const args = parseArgs(['--paths', 'apps/peskids/x.ts', 'docs/a.md']);
    assert.deepEqual(args.paths, ['apps/peskids/x.ts', 'docs/a.md']);
    assert.equal(args.graceUntilHour, null);
  });
});

describe('classifyPaths (regression — unchanged by this fix)', () => {
  it('flags apps/ and infra/ as prod-impact', () => {
    const { hasImpact, prod } = classifyPaths(['apps/peskids/app/page.tsx', 'infra/docker-compose.yml']);
    assert.equal(hasImpact, true);
    assert.equal(prod.length, 2);
  });

  it('treats docs-only changes as daytime-safe', () => {
    const { hasImpact } = classifyPaths(['docs/README.md', 'docs/runbooks/FOO.md']);
    assert.equal(hasImpact, false);
  });

  it('treats a mix of docs + apps as impactful (docs does not dilute prod paths)', () => {
    const { hasImpact } = classifyPaths(['docs/README.md', 'apps/api/app/route.ts']);
    assert.equal(hasImpact, true);
  });
});
