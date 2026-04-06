export function isPublicDemoRead(): boolean {
  return process.env.ADMIN_PUBLIC_DEMO_READ === "true";
}

/**
 * GET público solo cuando ADMIN_PUBLIC_DEMO_READ=true (demo familia).
 * Mutaciones siguen usando requireAdminToken.
 */
export function requireAdminTokenUnlessDemoRead(request: Request): Response | null {
  if (request.method === "GET" && isPublicDemoRead()) {
    return null;
  }
  return requireAdminToken(request);
}

export function requireAdminToken(request: Request): Response | null {
  const expected = process.env.PLATFORM_ADMIN_TOKEN;
  if (!expected || expected.length === 0) {
    return Response.json(
      { error: "Server misconfiguration: PLATFORM_ADMIN_TOKEN is not set" },
      { status: 500 },
    );
  }

  const auth = request.headers.get("authorization");
  const token =
    auth?.startsWith("Bearer ") === true ? auth.slice("Bearer ".length).trim() : "";

  if (token.length === 0 || token !== expected) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
