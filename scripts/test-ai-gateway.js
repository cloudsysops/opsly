#!/usr/bin/env node
const endpoint = process.env.AI_GATEWAY_TEST_URL || 'http://localhost:3001/api/ai/chat';
const model = process.env.NVIDIA_DEFAULT_MODEL || undefined;

async function main() {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: 'Say hello from Opsly AI Gateway.' }],
    }),
  });

  const body = await response.json().catch(() => null);
  if (!response.ok || !body || body.ok !== true) {
    const error = body && typeof body.error === 'string' ? body.error : `HTTP ${response.status}`;
    throw new Error(`AI Gateway test failed: ${error}`);
  }

  console.log(`provider: ${body.provider}`);
  console.log(`model: ${body.model}`);
  console.log(`content: ${body.content}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
