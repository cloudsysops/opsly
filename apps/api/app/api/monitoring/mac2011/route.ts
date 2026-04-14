import { readFile } from 'node:fs/promises';
import { requireAdminAccess } from '../../../../lib/auth';
import { HTTP_STATUS } from '../../../../lib/constants';

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

async function fetchStatusFromUrl(url: string): Promise<Response> {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      return Response.json(
        { error: 'upstream_error', status: res.status },
        { status: HTTP_STATUS.SERVICE_UNAVAILABLE }
      );
    }
    const data: unknown = await res.json();
    return Response.json(data);
  } catch (err) {
    return Response.json(
      { error: 'fetch_failed', message: errorMessage(err) },
      { status: HTTP_STATUS.SERVICE_UNAVAILABLE }
    );
  }
}

async function readStatusFromFile(filePath: string): Promise<Response> {
  try {
    const raw = await readFile(filePath, 'utf8');
    const data: unknown = JSON.parse(raw);
    return Response.json(data);
  } catch (err) {
    return Response.json(
      { error: 'file_read_failed', message: errorMessage(err) },
      { status: HTTP_STATUS.SERVICE_UNAVAILABLE }
    );
  }
}

/**
 * Estado del worker `opsly-worker` (JSON de `scripts/mac2011-monitor.sh`).
 * Sin datos simulados: configurar `MAC2011_STATUS_URL` o `MAC2011_STATUS_FILE` en la API.
 */
export async function GET(request: Request): Promise<Response> {
  const auth = await requireAdminAccess(request);
  if (auth) {
    return auth;
  }

  const url = process.env.MAC2011_STATUS_URL?.trim();
  if (url && url.length > 0) {
    return fetchStatusFromUrl(url);
  }

  const filePath = process.env.MAC2011_STATUS_FILE?.trim();
  if (filePath && filePath.length > 0) {
    return readStatusFromFile(filePath);
  }

  return Response.json(
    {
      error: 'not_configured',
      hint: 'Define MAC2011_STATUS_URL (HTTP) o MAC2011_STATUS_FILE (ruta al JSON de mac2011-monitor.sh) en el entorno del contenedor API.',
    },
    { status: HTTP_STATUS.NOT_IMPLEMENTED }
  );
}
