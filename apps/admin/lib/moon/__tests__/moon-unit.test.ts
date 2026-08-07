/**
 * Pure unit tests for Moon helpers (no network, no secrets).
 * Run: npm run test:moon --workspace=@intcloudsysops/admin
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  omitMrrUntilCommercialSource,
  moonConfidenceLabel,
} from '../data-label';
import { healthFromTenantStatus, sanitizeTenantForMoonCard } from '../tenant-card';
import { isMoonNavActive, MOON_NAV_SECTIONS } from '../nav';
import { mapTeamMetricsToMoonTasks, summarizeQueueFromTeams } from '../queue-mapper';
import { matchMoonCommands, MOON_COMMAND_SUGGESTIONS } from '../command-router';
import type { TeamMetrics } from '../../types';

describe('moon data labels', () => {
  it('omits MRR with PROYECTADO label', () => {
    const mrr = omitMrrUntilCommercialSource();
    assert.equal(mrr.value, null);
    assert.equal(mrr.confidence, 'PROYECTADO');
    assert.ok(mrr.omittedReason?.includes('MRR'));
  });

  it('labels confidence', () => {
    assert.equal(moonConfidenceLabel('REAL'), 'REAL');
    assert.equal(moonConfidenceLabel('ESTIMADO'), 'ESTIMADO');
  });
});

describe('tenant card sanitize', () => {
  it('never includes owner_email', () => {
    const card = sanitizeTenantForMoonCard({
      id: '1',
      slug: 'peskids',
      name: 'Peskids',
      plan: 'business',
      status: 'active',
      updated_at: '2026-01-01T00:00:00Z',
      created_at: '2026-01-01T00:00:00Z',
    });
    assert.equal(card.slug, 'peskids');
    assert.equal(card.health.tone, 'healthy');
    assert.equal('owner_email' in card, false);
  });

  it('maps failed to critical', () => {
    assert.equal(healthFromTenantStatus('failed').tone, 'critical');
  });
});

describe('moon nav', () => {
  it('activates /moon home', () => {
    assert.equal(isMoonNavActive('/moon', '/moon'), true);
    assert.equal(isMoonNavActive('/dashboard', '/moon'), true);
  });

  it('activates legacy tenants under clients', () => {
    assert.equal(isMoonNavActive('/tenants', '/moon/clients'), true);
  });

  it('has platform sections without peskids pipeline', () => {
    const hrefs = MOON_NAV_SECTIONS.flatMap((s) => s.items.map((i) => i.href)).join(' ');
    assert.equal(hrefs.includes('interesados'), false);
    assert.equal(hrefs.includes('pipeline'), false);
    assert.ok(hrefs.includes('/moon/clients'));
    assert.ok(hrefs.includes('/moon/reports'));
    assert.ok(hrefs.includes('/moon/command'));
  });
});

describe('queue mapper', () => {
  it('maps teams without inventing envelope', () => {
    const teams: TeamMetrics[] = [
      {
        name: 'planner',
        specialization: 'plan',
        max_parallel: 2,
        handles: ['a'],
        status: 'busy',
        waiting: 1,
        active: 1,
      },
    ];
    const tasks = mapTeamMetricsToMoonTasks(teams);
    assert.equal(tasks.length, 1);
    assert.equal(tasks[0]?.correlation_id, null);
    assert.equal(tasks[0]?.status, 'running');
    const summary = summarizeQueueFromTeams(teams);
    assert.equal(summary.waiting, 1);
    assert.equal(summary.confidence, 'REAL');
  });
});

describe('command router dry-run', () => {
  it('returns catalog when query empty', () => {
    assert.equal(matchMoonCommands('').length, MOON_COMMAND_SUGGESTIONS.length);
  });

  it('matches health keywords', () => {
    const hits = matchMoonCommands('ram vps');
    assert.ok(hits.some((h) => h.href === '/moon/health'));
  });

  it('never routes to peskids pipeline', () => {
    const hrefs = matchMoonCommands('leads pipeline').map((h) => h.href).join(' ');
    assert.equal(hrefs.includes('interesados'), false);
    assert.equal(hrefs.includes('peskids'), false);
  });
});
