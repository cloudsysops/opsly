/**
 * API response utilities for Next.js route handlers
 */

import type { NextRequest } from 'next/server';
import { HTTP_STATUS } from './constants';

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
      response: Response.json(
        { error: 'Invalid JSON body' },
        { status: HTTP_STATUS.BAD_REQUEST }
      ),
    };
  }
}

export function jsonSuccess(data: unknown, statusCode = HTTP_STATUS.OK): Response {
  return Response.json(data, { status: statusCode });
}

export function jsonError(message: string, statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR): Response {
  return Response.json({ error: message }, { status: statusCode });
}
