/**
 * API response utilities for Next.js route handlers
 */

import type { NextRequest } from 'next/server';
import { HTTP_STATUS } from './constants';
import { logger } from '../logger';

export async function parseJsonBody(request: NextRequest): Promise<{
  ok: boolean;
  body?: Record<string, unknown>;
  response?: Response;
}> {
  try {
    const body = await request.json();
    return { ok: true, body };
  } catch (error) {
    return {
      ok: false,
      response: Response.json({ error: 'Invalid JSON body' }, { status: HTTP_STATUS.BAD_REQUEST }),
    };
  }
}

export function jsonSuccess(data: unknown, statusCode: number = HTTP_STATUS.OK): Response {
  return Response.json(data, { status: statusCode });
}

export function jsonError(
  message: string,
  statusCode: number = HTTP_STATUS.INTERNAL_ERROR
): Response {
  return Response.json({ error: message }, { status: statusCode });
}

export function jsonOk(data: unknown, statusCode: number = HTTP_STATUS.OK): Response {
  return Response.json({ ok: true, data }, { status: statusCode });
}

export function serverErrorLogged(context: string, error: unknown): Response {
  const message = error instanceof Error ? error.message : String(error);
  logger.error(context, {
    error: message,
    stack: error instanceof Error ? error.stack : undefined,
  });
  return Response.json({ error: message }, { status: HTTP_STATUS.INTERNAL_ERROR });
}

export function tryRoute<T>(
  context: string,
  handler: (request?: NextRequest) => T | Promise<T>
): (request: NextRequest) => Promise<Response> {
  return async (request: NextRequest): Promise<Response> => {
    try {
      const result = await handler(request);
      return Response.json(result, { status: HTTP_STATUS.OK });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(context, {
        error: message,
        stack: err instanceof Error ? err.stack : undefined,
      });
      return Response.json({ error: message }, { status: HTTP_STATUS.INTERNAL_ERROR });
    }
  };
}
