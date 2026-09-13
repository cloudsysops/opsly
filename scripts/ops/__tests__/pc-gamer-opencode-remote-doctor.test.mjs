import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const file = new URL('../pc-gamer-opencode-remote-doctor.sh', import.meta.url);

test('Gamer remote doctor is read-only and requires canonical readiness', async () => {
  const source = await readFile(file, 'utf8');

  assert.match(source, /check-pc-gamer-online\.sh --json/);
  assert.match(source, /pc-gamer-opencode-plane\.sh --doctor/);
  assert.match(source, /git rev-parse --abbrev-ref HEAD/);
  assert.match(source, /GAMER_OPENCODE_REMOTE_READY/);

  assert.doesNotMatch(source, /--up/);
  assert.doesNotMatch(source, /--down/);
  assert.doesNotMatch(source, /--install-autostart/);
  assert.doesNotMatch(source, /git reset|git pull|git checkout|git switch/);
  assert.doesNotMatch(source, /docker compose .*up/);
});
