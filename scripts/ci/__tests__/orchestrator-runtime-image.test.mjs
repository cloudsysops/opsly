import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('orchestrator runtime image includes agent-services.yaml', async () => {
  const dockerfile = await readFile(new URL('../../../apps/orchestrator/Dockerfile', import.meta.url), 'utf8');
  assert.match(
    dockerfile,
    /COPY --from=builder \/app\/config\/agent-services\.yaml \.\/config\/agent-services\.yaml/,
    'runtime image must package config/agent-services.yaml for /api/local/state and local adapters',
  );
});
