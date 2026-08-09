/**
 * Respuestas JSON coherentes para Route Handlers (Next.js App Router).
 * Evita duplicar `{ error: string }` + status y centraliza logging de 500.
 */

import { HTTP_STATUS, REQUEST_BODY_LIMITS } from './constants';

export type ApiErrorBody = {
  error: string;
};

export function jsonError(message: string, status: number): Response {
  const body: ApiErrorBody = { error: message };
  return Response.json(body, { status });
}

export function jsonOk(data: unknown, status: number = HTTP_STATUS.OK): Response {
  return Response.json(data, { status });
}

/**
 * Lee el cuerpo como texto con tope de bytes (Content-Length + buffer real).
 * Mitiga DoS por JSON/webhook gigantes en memoria.
 */
export async function readTextBodyLimited(
  request: Request,
  maxBytes: number = REQUEST_BODY_LIMITS.JSON_DEFAULT_BYTES
): Promise<{ ok: true; text: string } | { ok: false; response: Response }> {
  const contentLengthHeader = request.headers.get('content-length');
  if (contentLengthHeader) {
    const declared = Number.parseInt(contentLengthHeader, 10);
    if (Number.isFinite(declared) && declared > maxBytes) {
      return {
        ok: false,
        response: jsonError('Request body too large', HTTP_STATUS.PAYLOAD_TOO_LARGE),
      };
    }
  }

  let buffer: ArrayBuffer;
  try {
    buffer = await request.arrayBuffer();
  } catch {
    return {
      ok: false,
      response: jsonError('Invalid request body', HTTP_STATUS.BAD_REQUEST),
    };
  }

  if (buffer.byteLength > maxBytes) {
    return {
      ok: false,
      response: jsonError('Request body too large', HTTP_STATUS.PAYLOAD_TOO_LARGE),
    };
  }

  return { ok: true, text: new TextDecoder('utf-8').decode(buffer) };
}

export async function parseJsonBody(
  request: Request,
  maxBytes: number = REQUEST_BODY_LIMITS.JSON_DEFAULT_BYTES
): Promise<{ ok: true; body: unknown } | { ok: false; response: Response }> {
  const limited = await readTextBodyLimited(request, maxBytes);
  if (!limited.ok) {
    return limited;
  }

  if (limited.text.trim().length === 0) {
    return {
      ok: false,
      response: jsonError('Invalid JSON body', HTTP_STATUS.BAD_REQUEST),
    };
  }

  try {
    const body: unknown = JSON.parse(limited.text);
    return { ok: true, body };
  } catch {
    return {
      ok: false,
      response: jsonError('Invalid JSON body', HTTP_STATUS.BAD_REQUEST),
    };
  }
}

/** Registra `err` y devuelve 500 con mensaje genérico al cliente. */
export function serverErrorLogged(context: string, err: unknown): Response {
  console.error(context, err);
  return jsonError('Internal server error', HTTP_STATUS.INTERNAL_ERROR);
}

/**
 * Ejecuta un handler async; ante excepción no capturada devuelve 500 logueado.
 * Útil cuando el cuerpo del método tiene varios `await` sin try/catch local.
 */
export async function tryRoute(
  context: string,
  handler: () => Promise<Response>
): Promise<Response> {
  try {
    return await handler();
  } catch (err) {
    return serverErrorLogged(context, err);
  }
}
