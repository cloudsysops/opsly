import { jsonError, parseJsonBody } from './api-response';
import { HTTP_STATUS } from './constants';
import {
  createLocalServicesBusinessResource,
  listLocalServicesBusinessResource,
  type LocalServicesBusinessResource,
} from './local-services-business';
import { requireAdminAccess } from './auth';

export async function runLocalServicesBusinessRoute(
  resource: LocalServicesBusinessResource,
  request: Request
): Promise<Response> {
  const denied = await requireAdminAccess(request);
  if (denied) {
    return denied;
  }
  if (request.method === 'GET') {
    return listLocalServicesBusinessResource(resource, request);
  }
  if (request.method === 'POST') {
    const parsed = await parseJsonBody(request);
    if (!parsed.ok) {
      return parsed.response;
    }
    return createLocalServicesBusinessResource(resource, parsed.body);
  }
  return jsonError('Method not allowed', HTTP_STATUS.METHOD_NOT_ALLOWED);
}
