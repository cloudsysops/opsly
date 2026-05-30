import { createOpslyCore } from '../index.js';
import { paniniLabTenantConfig } from '../../../../apps/panini-lab/config/tenant.config.js';
import { peskidsTenantConfig } from '../../../../apps/peskids/config/tenant.config.js';
import { smileTripCareTenantConfig } from '../../../../apps/smiletripcare/config/tenant.config.js';

const samples = [
  {
    tenantSlug: paniniLabTenantConfig.slug,
    utterance: 'Tengo la 10 de Colombia y repetida la 30',
  },
  {
    tenantSlug: peskidsTenantConfig.slug,
    utterance: 'Soy la mamá de Thiago, hoy no va a clase porque tiene fiebre',
  },
  {
    tenantSlug: smileTripCareTenantConfig.slug,
    utterance: 'Necesito una valoración dental',
  },
] as const;

async function main(): Promise<void> {
  const { runtime, eventLog } = createOpslyCore({
    tenants: [paniniLabTenantConfig, peskidsTenantConfig, smileTripCareTenantConfig],
    aiProvider: process.env.OPSLY_AI_PROVIDER === 'gemini' ? 'gemini' : 'mock',
    geminiApiKey: process.env.GEMINI_API_KEY,
  });

  for (const sample of samples) {
    const result = await runtime.handle(sample);
    console.log(JSON.stringify({ input: sample, result }, null, 2));
  }

  for (const tenant of [paniniLabTenantConfig, peskidsTenantConfig, smileTripCareTenantConfig]) {
    const events = await eventLog.listByTenant(tenant.slug);
    console.log(`\nEvent log (${tenant.slug}): ${events.length} event(s)`);
    for (const event of events) {
      console.log(`  ${event.status} ${event.intent} [${event.id}]`);
    }
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
