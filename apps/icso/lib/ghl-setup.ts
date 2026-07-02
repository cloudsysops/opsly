/**
 * LEGACY — GoHighLevel agency helpers for ICSO.
 * Active only when INTCLOUDSYSOPS_GHL_ENABLED=true.
 * @deprecated Primary CRM path is Twenty + Supabase (see docs/tenants/intcloudsysops/TWENTY-CRM.md).
 */
import { isIntcloudsysopsGhlEnabled } from '@intcloudsysops/services/twenty';
import { GoHighLevelClient, resolveGoHighLevelEnv, isGoHighLevelConfigured } from '@intcloudsysops/services/gohighlevel';

interface IcsoGhlStatus {
  configured: boolean;
  locationId: string;
  pipelines: { id: string; name: string }[];
  forms: { id: string; name: string }[];
  calendars: { id: string; name: string }[];
}

export async function getIcsoGhlStatus(): Promise<IcsoGhlStatus> {
  const status: IcsoGhlStatus = {
    configured: isGoHighLevelConfigured() && isIntcloudsysopsGhlEnabled(),
    locationId: '',
    pipelines: [],
    forms: [],
    calendars: [],
  };

  if (!status.configured) {
    return status;
  }

  const ghlEnv = resolveGoHighLevelEnv();
  status.locationId = ghlEnv.locationId;

  try {
    const client = new GoHighLevelClient(ghlEnv.apiKey, ghlEnv.baseUrl, {
      locationId: ghlEnv.locationId,
      apiVersion: ghlEnv.apiVersion,
    });

    const pipelines = await client.listPipelines();
    status.pipelines = pipelines.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name }));

    const forms = await client.listForms();
    status.forms = forms.map((f: { id: string; name: string }) => ({ id: f.id, name: f.name }));

    const calendars = await client.listCalendars();
    status.calendars = calendars.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name }));
  } catch (error) {
    console.error('Failed to fetch ICSO GHL status:', error);
  }

  return status;
}

export async function findIcsoSalesPipeline(): Promise<string | null> {
  if (!isIntcloudsysopsGhlEnabled()) {
    return null;
  }
  const status = await getIcsoGhlStatus();
  const pipeline = status.pipelines.find((p) => p.name.includes('Opsly Agency Sales'));
  return pipeline?.id || null;
}

export async function findIcsoDiscoveryCalendar(): Promise<string | null> {
  if (!isIntcloudsysopsGhlEnabled()) {
    return null;
  }
  const status = await getIcsoGhlStatus();
  const calendar = status.calendars.find((c) => c.name.includes('Discovery Call'));
  return calendar?.id || null;
}
