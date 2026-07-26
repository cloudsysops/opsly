export function getCORSHeaders(origin?: string) {
  // Whitelist of allowed origins
  const allowedOrigins = [
    'http://localhost:3004',
    'http://localhost:3000',
    process.env.NEXT_PUBLIC_APP_URL,
    'https://peskids.op-sly.com',
  ].filter(Boolean);

  const isAllowed = !origin || allowedOrigins.includes(origin);

  return {
    'Access-Control-Allow-Origin': isAllowed ? (origin || '*') : '',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
    'Access-Control-Max-Age': '3600',
    'Access-Control-Allow-Credentials': 'true',
  };
}

export function withCORS(response: Response, request: Request) {
  const origin = request.headers.get('origin') ?? undefined;
  const headers = getCORSHeaders(origin);

  Object.entries(headers).forEach(([key, value]) => {
    if (value) response.headers.set(key, value);
  });

  return response;
}
