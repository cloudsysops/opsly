const FORWARD_HEADER_NAMES = [
  'authorization',
  'x-admin-token',
  'x-tenant-id',
  'cookie',
  'content-type',
  'stripe-signature',
  'x-request-id',
] as const;

export function getPlatformApiBaseUrl(): string | null {
  const internal = process.env.INTERNAL_API_URL?.trim();
  if (internal && internal.length > 0) {
    return internal.replace(/\/+$/, '');
  }
  const publicUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (publicUrl && publicUrl.length > 0) {
    return publicUrl.replace(/\/+$/, '');
  }
  return null;
}

type ProxyOptions = {
  apiPath: string;
  request: Request;
};

export async function proxyToPlatformApi({ apiPath, request }: ProxyOptions): Promise<Response> {
  const base = getPlatformApiBaseUrl();
  if (base == null) {
    return Response.json(
      { error: 'API base not configured: set INTERNAL_API_URL or NEXT_PUBLIC_API_URL' },
      { status: 503 }
    );
  }

  if (!apiPath.startsWith('/')) {
    return Response.json({ error: 'proxy internal error: apiPath must start with /' }, { status: 500 });
  }

  const target = new URL(`${base}${apiPath}`);
  const incoming = new URL(request.url);
  target.search = incoming.search;

  const headers = new Headers();
  for (const name of FORWARD_HEADER_NAMES) {
    const v = request.headers.get(name);
    if (v != null && v.length > 0) {
      headers.set(name, v);
    }
  }

  const method = request.method;
  const body =
    method === 'GET' || method === 'HEAD' || method === 'OPTIONS' ? undefined : await request.arrayBuffer();

  const res = await fetch(target, { method, headers, body, redirect: 'manual' });
  const out = new Response(res.body, { status: res.status, statusText: res.statusText });
  res.headers.forEach((value, key) => {
    out.headers.set(key, value);
  });
  out.headers.set('x-opsly-web-proxy', '1');
  return out;
}

export async function withLegacyTenantIdOnPost(res: Response): Promise<Response> {
  if (res.status !== 202) {
    return res;
  }
  const text = await res.text();
  type Body = { id?: string; slug?: string; status?: string; tenantId?: string };
  let body: Body;
  try {
    body = JSON.parse(text) as Body;
  } catch {
    return new Response(text, { status: 202, headers: res.headers });
  }
  if (body == null || typeof body !== 'object' || 'tenantId' in body) {
    return new Response(JSON.stringify(body), { status: 202, headers: res.headers });
  }
  if (body.id == null) {
    return new Response(JSON.stringify(body), { status: 202, headers: res.headers });
  }
  return Response.json({ ...body, tenantId: body.id }, { status: 202, headers: res.headers });
}

export async function mapStackStatusToContainerStatus(res: Response): Promise<Response> {
  if (!res.ok) {
    return res;
  }
  const text = await res.text();
  try {
    const data = JSON.parse(text) as Record<string, unknown>;
    if (
      data != null &&
      typeof data === 'object' &&
      'stack_status' in data &&
      !('containerStatus' in data)
    ) {
      return Response.json(
        { ...data, containerStatus: data.stack_status },
        { status: res.status, headers: res.headers }
      );
    }
  } catch {
    return new Response(text, { status: res.status, headers: res.headers });
  }
  return new Response(text, { status: res.status, headers: res.headers });
}

export async function mapApiStatusToLegacySuccess(res: Response): Promise<Response> {
  if (!res.ok) {
    return res;
  }
  const text = await res.text();
  try {
    const o = JSON.parse(text) as { status?: string };
    if (o != null && typeof o === 'object' && (o.status === 'suspended' || o.status === 'active')) {
      return Response.json({ success: true as const }, { status: res.status, headers: res.headers });
    }
  } catch {
    return new Response(text, { status: res.status, headers: res.headers });
  }
  return new Response(text, { status: res.status, headers: res.headers });
}
