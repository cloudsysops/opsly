import { jsonError } from './api-response';
import { HTTP_STATUS, LIST_TENANTS } from './constants';

export const LOCAL_SERVICES_BUSINESS_RESOURCES = [
  'services',
  'customers',
  'bookings',
  'quotes',
  'reports',
] as const;

export type LocalServicesBusinessResource = (typeof LOCAL_SERVICES_BUSINESS_RESOURCES)[number];

export function isLocalServicesBusinessResource(
  value: string
): value is LocalServicesBusinessResource {
  return (LOCAL_SERVICES_BUSINESS_RESOURCES as readonly string[]).includes(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function parseLocalServicesListQuery(request: Request): {
  limit: number;
  offset: number;
} {
  const url = new URL(request.url);
  const limitRaw = url.searchParams.get('limit');
  const offsetRaw = url.searchParams.get('offset');
  const defaultLimit = LIST_TENANTS.DEFAULT_LIMIT;
  const maxLimit = LIST_TENANTS.MAX_LIMIT;
  const limitParsed = limitRaw ? Number.parseInt(limitRaw, 10) : defaultLimit;
  const limit =
    Number.isFinite(limitParsed) && limitParsed > 0 && limitParsed <= maxLimit
      ? limitParsed
      : defaultLimit;
  const offParsed = offsetRaw ? Number.parseInt(offsetRaw, 10) : 0;
  const offset = Number.isFinite(offParsed) && offParsed >= 0 ? offParsed : 0;
  return { limit, offset };
}

export function listLocalServicesBusinessResource(
  resource: LocalServicesBusinessResource,
  request: Request
): Response {
  const { limit, offset } = parseLocalServicesListQuery(request);
  return Response.json({
    resource,
    items: [],
    total: 0,
    limit,
    offset,
    phase: 'stub',
    generated_at: new Date().toISOString(),
  });
}

export function createLocalServicesBusinessResource(
  resource: LocalServicesBusinessResource,
  body: unknown
): Response {
  if (!isRecord(body)) {
    return jsonError('Body must be a JSON object', HTTP_STATUS.BAD_REQUEST);
  }
  return Response.json(
    {
      error: 'NOT_IMPLEMENTED',
      message: `POST /api/local-services/${resource} is not persisted yet (awaiting platform tables).`,
    },
    { status: HTTP_STATUS.NOT_IMPLEMENTED }
  );
}
