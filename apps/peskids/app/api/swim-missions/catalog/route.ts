import { listSwimMissionCatalog } from '@/lib/services/swim-mission.service';
import { internalErrorJson, resolveRequestId, successJson } from '@/lib/api-response';

export async function GET(request: Request) {
  const requestId = resolveRequestId(request);
  try {
    const missions = await listSwimMissionCatalog();
    return successJson(requestId, { ok: true, missions });
  } catch (error) {
    return internalErrorJson(
      requestId,
      'swim-missions.catalog.get',
      error,
      'Unable to load swim missions'
    );
  }
}
