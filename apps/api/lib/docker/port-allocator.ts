import { getServiceClient } from '../supabase';

const AVAILABLE_SERVICE_MARKER = 'available';

export async function allocatePorts(
  tenantId: string,
  services: string[]
): Promise<Record<string, number>> {
  if (services.length === 0) {
    return {};
  }

  const adminClient = getServiceClient();

  const { data: rows, error: selectError } = await adminClient
    .schema('platform')
    .from('port_allocations')
    .select('port, tenant_id, service, allocated_at')
    .is('tenant_id', null)
    .order('port', { ascending: true })
    .limit(services.length);

  if (selectError) {
    throw new Error(`Failed to reserve ports: ${selectError.message}`);
  }

  if (!rows || rows.length < services.length) {
    throw new Error('Not enough free ports available for this tenant');
  }

  const result: Record<string, number> = {};

  for (let i = 0; i < services.length; i += 1) {
    const row = rows[i];
    const serviceName = services[i];
    if (!row) {
      throw new Error('Port allocation row missing');
    }

    const { error: updateError } = await adminClient
      .schema('platform')
      .from('port_allocations')
      .update({
        tenant_id: tenantId,
        service: serviceName,
      })
      .eq('port', row.port);

    if (updateError) {
      throw new Error(`Failed to assign port ${row.port}: ${updateError.message}`);
    }

    result[serviceName] = row.port;
  }

  return result;
}

export async function releasePorts(tenantId: string): Promise<void> {
  const { error } = await getServiceClient()
    .schema('platform')
    .from('port_allocations')
    .update({
      tenant_id: null,
      service: AVAILABLE_SERVICE_MARKER,
    })
    .eq('tenant_id', tenantId);

  if (error) {
    throw new Error(`Failed to release ports: ${error.message}`);
  }
}
