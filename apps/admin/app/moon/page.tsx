import { MoonHomeClient } from '@/components/moon/moon-home-client';
import { loadTenantConfigSummaries } from '@/lib/moon/config-loaders';

export default async function MoonHomePage(): Promise<React.ReactElement> {
  const configSummaries = await loadTenantConfigSummaries();
  return <MoonHomeClient configSummaries={configSummaries} />;
}
