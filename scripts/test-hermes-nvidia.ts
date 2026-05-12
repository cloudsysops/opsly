/**
 * Smoke: POST /api/agents/hermes/run con token admin.
 *
 * Doppler = fuente de verdad: las vars NVIDIA/HERMES deben estar en el **proceso API** (no solo en esta shell).
 *   doppler run --project ops-intcloudsysops --config prd -- npm run dev --workspace=@intcloudsysops/api
 *   doppler run --project ops-intcloudsysops --config prd -- npm run test:hermes-nvidia
 *
 * Esta shell necesita: OPSLY_API_URL, PLATFORM_ADMIN_TOKEN
 */

const base = (process.env.OPSLY_API_URL ?? 'http://127.0.0.1:3000').replace(/\/$/, '');
const token = process.env.PLATFORM_ADMIN_TOKEN?.trim() ?? '';

async function main(): Promise<void> {
  if (token.length === 0) {
    console.error('Missing PLATFORM_ADMIN_TOKEN');
    process.exit(1);
  }

  const res = await fetch(`${base}/api/agents/hermes/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      task: 'Review Opsly AI Gateway architecture and list top 5 risks.',
      mode: 'security',
    }),
  });

  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    console.error('HTTP', res.status, json);
    process.exit(1);
  }

  if (json.ok !== true) {
    console.error('Response not ok:', json);
    process.exit(1);
  }

  console.log('provider:', json.provider);
  console.log('model:', json.model);
  console.log('result:\n', json.result);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
