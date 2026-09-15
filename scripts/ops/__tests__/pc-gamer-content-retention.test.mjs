import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { listCleanupCandidates, runRetention } from '../pc-gamer-content-retention.mjs';

function fixtureRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pc-gamer-retention-'));
  const projectRoot = path.join(root, 'tenants', 'icso-gaming-tbd', 'projects', 'old-archived');
  fs.mkdirSync(projectRoot, { recursive: true });
  fs.mkdirSync(path.join(root, 'artifacts', 'old-archived'), { recursive: true });
  fs.writeFileSync(path.join(root, 'artifacts', 'old-archived', 'draft.mp4'), 'draft');
  fs.writeFileSync(path.join(projectRoot, 'project.json'), JSON.stringify({ project: {
    status: 'archived', updatedAt: '2026-01-01T00:00:00.000Z',
  } }));
  return root;
}

describe('PC-gamer content retention', () => {
  it('only selects old archived project artifacts', () => {
    const root = fixtureRoot();
    expect(listCleanupCandidates(root, Date.parse('2026-02-15T00:00:00.000Z'), 30)).toHaveLength(1);
  });

  it('is dry-run by default and removes only selected artifacts with apply', () => {
    const root = fixtureRoot();
    expect(runRetention({ root, now: Date.parse('2026-02-15T00:00:00.000Z') }).removed).toHaveLength(0);
    expect(fs.existsSync(path.join(root, 'artifacts', 'old-archived'))).toBe(true);
    expect(runRetention({ root, now: Date.parse('2026-02-15T00:00:00.000Z'), apply: true }).removed).toHaveLength(1);
    expect(fs.existsSync(path.join(root, 'artifacts', 'old-archived'))).toBe(false);
  });
});
