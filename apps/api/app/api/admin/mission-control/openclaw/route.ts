import { requireAdminAccess } from '../../../../../lib/auth';
import { HTTP_STATUS } from '../../../../../lib/constants';
import { getOpenClawMissionControlSnapshot } from '../../../../../lib/admin-mission-control-openclaw';

export async function GET(request: Request): Promise<Response> {
  const auth = await requireAdminAccess(request);
  if (auth) {
    return auth;
  }

  try {
    const snapshot = await getOpenClawMissionControlSnapshot();
    return Response.json(snapshot, { status: HTTP_STATUS.OK });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json(
      { error: `failed_to_read_openclaw_snapshot: ${message}` },
      { status: HTTP_STATUS.SERVICE_UNAVAILABLE }
    );
  }
}
