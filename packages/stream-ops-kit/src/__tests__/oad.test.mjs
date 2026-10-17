import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ALIASES, resolveAlias } from '../oad-scenes.mjs';

test('resolves every documented CLI word', () => {
  assert.equal(resolveAlias('gaming').tenantKey, 'juego');
  assert.equal(resolveAlias('coding').tenantKey, 'coding');
  assert.equal(resolveAlias('intermission').tenantKey, 'brb');
  assert.equal(resolveAlias('starting').tenantKey, 'inicio');
});

test('factory is intentionally unmapped, not guessed', () => {
  assert.equal(resolveAlias('factory').tenantKey, null);
});

test('is case-insensitive', () => {
  assert.equal(resolveAlias('Coding').tenantKey, 'coding');
});

test('rejects an unknown word', () => {
  assert.throws(() => resolveAlias('bogus'), RangeError);
});

test('rejects a raw tenant/physical scene name used as a CLI word', () => {
  assert.throws(() => resolveAlias('Battlefield 6 — Día 2'), RangeError);
});

test('rejects shell-injection-shaped input', () => {
  assert.throws(() => resolveAlias("coding; rm -rf /"), RangeError);
});

test('rejects the removed live/stop verbs from the local operator tool', () => {
  assert.throws(() => resolveAlias('live'), RangeError);
  assert.throws(() => resolveAlias('stop'), RangeError);
});

test('allowlist matches the documented minimal surface exactly', () => {
  assert.deepEqual(Object.keys(ALIASES).sort(), ['coding', 'factory', 'gaming', 'intermission', 'starting']);
});
