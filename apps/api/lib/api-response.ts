/**
 * Respuestas JSON coherentes para Route Handlers (Next.js App Router).
 * Evita duplicar `{ error: string }` + status y centraliza logging de 500.
 */

import { HTTP_STATUS } from "./constants";

export type ApiErrorBody = {
  error: string;
};

export function jsonError(message: string, status: number): Response {
  const body: ApiErrorBody = { error: message };
  return Response.json(body, { status });
}

/** Registra `err` y devuelve 500 con mensaje genérico al cliente. */
export function serverErrorLogged(context: string, err: unknown): Response {
  console.error(context, err);
  return jsonError("Internal server error", HTTP_STATUS.INTERNAL_ERROR);
}

/**
 * Ejecuta un handler async; ante excepción no capturada devuelve 500 logueado.
 * Útil cuando el cuerpo del método tiene varios `await` sin try/catch local.
 */
export async function tryRoute(
  context: string,
  handler: () => Promise<Response>,
): Promise<Response> {
  try {
    return await handler();
  } catch (err) {
    return serverErrorLogged(context, err);
  }
}
