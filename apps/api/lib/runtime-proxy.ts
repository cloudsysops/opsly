import { HTTP_STATUS } from './constants';
import { ORCHESTRATOR_INTERNAL_URL } from './admin-ollama-demo';

function adminToken(): string {
  return process.env.PLATFORM_ADMIN_TOKEN?.trim() ?? '';
}

function orchestratorHeaders(): HeadersInit | null {
  const token = adminToken();
  if (token.length === 0) {
    return null;
  }
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export function missingRuntimeAdminTokenResponse(): Response {
  return Response.json(
    { error: 'Server misconfiguration: PLATFORM_ADMIN_TOKEN is not set' },
    { status: HTTP_STATUS.INTERNAL_ERROR }
  );
}

export async function proxyRuntimeOrchestrator(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const headers = orchestratorHeaders();
  if (headers === null) {
    return missingRuntimeAdminTokenResponse();
  }
  try {
    const response = await fetch(`${ORCHESTRATOR_INTERNAL_URL}${path}`, {
      ...init,
      headers: {
        ...headers,
        ...(init.headers ?? {}),
      },
      cache: 'no-store',
    });
    const text = await response.text();
    return new Response(text, {
      status: response.status,
      headers: { 'Content-Type': response.headers.get('content-type') ?? 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json(
      { error: `orchestrator unreachable: ${message}` },
      { status: HTTP_STATUS.SERVICE_UNAVAILABLE }
    );
  }
}
