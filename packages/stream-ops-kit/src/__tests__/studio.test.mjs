import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(here, '../../../../apps/opsafterdark/stream-overlay/studio-dashboard.html'), 'utf8');

test('studio asset states its identity and the production chain in order', () => {
  assert.match(html, /OPSAFTERDARK \/ AI FACTORY STUDIO/);
  assert.match(html, /Human-directed music production/);
  const stages = ['COMPOSE', 'ARRANGE', 'MIX', 'MASTER', 'RELEASE'];
  const chain = html.slice(html.indexOf('id="chain"'));
  const idx = stages.map((s) => chain.indexOf(`>${s}<`));
  assert.ok(idx.every((i) => i >= 0), 'all stages present');
  assert.deepEqual([...idx].sort((a, b) => a - b), idx, 'stages in order');
});

test('studio asset never claims unverified state', () => {
  assert.doesNotMatch(html, /CONNECTED/);
  assert.doesNotMatch(html, /\/feed|\/studio\/mode/);
  assert.match(html, /UNKNOWN/);
  assert.match(html, /UNVERIFIED/);
});

test('RELEASE is disabled and has no handler', () => {
  assert.match(html, /class="s rel" aria-disabled="true"/);
  assert.doesNotMatch(html, /addEventListener\('click'|onclick/);
});

test('camera mode makes the page transparent', () => {
  assert.match(html, /html\.camera,html\.camera body\{background:transparent\}/);
});
