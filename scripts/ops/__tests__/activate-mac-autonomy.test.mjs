import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const file = new URL('../activate-mac-autonomy.sh', import.meta.url);

test('activation orders bootstrap then go-live then background enable', async () => {
  const source = await readFile(file, 'utf8');
  const bootstrap = source.indexOf('npm run opsly:mac:bootstrap');
  const goLive = source.indexOf('npm run opsly:mac:go-live');
  const enable = source.indexOf('npm run opsly:background:launchd:enable');
  assert.ok(bootstrap >= 0);
  assert.ok(goLive > bootstrap);
  assert.ok(enable > goLive);
});

test('activation requires main and clean checkout', async () => {
  const source = await readFile(file, 'utf8');
  assert.match(source, /checkout must be main/);
  assert.match(source, /working tree must be clean/);
});

test('activation does not deploy production or force git history', async () => {
  const source = await readFile(file, 'utf8');
  assert.doesNotMatch(source, /terraform apply|peskids-deploy|git reset --hard|git push --force/);
});
