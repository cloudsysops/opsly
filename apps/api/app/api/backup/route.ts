import { requireAdminAccess } from '../../../lib/auth';
import { HTTP_STATUS } from '../../../lib/constants';

const BACKUP_NOT_IMPLEMENTED_MESSAGE =
  'Backup API not implemented yet. Use scripts/backup-tenants.sh until the API runner is available.';

export async function POST(request: Request): Promise<Response> {
  const authError = await requireAdminAccess(request);
  if (authError) {
    return authError;
  }

  return Response.json(
    { error: BACKUP_NOT_IMPLEMENTED_MESSAGE },
    { status: HTTP_STATUS.NOT_IMPLEMENTED }
  );
}
