import { MoonClientsClient } from '@/components/moon/moon-clients-client';
import { loadTenantConfigSummaries } from '@/lib/moon/config-loaders';

export default async function MoonClientsPage(): Promise<React.ReactElement> {
  const configSummaries = await loadTenantConfigSummaries();
  return <MoonClientsClient configSummaries={configSummaries} />;
}
