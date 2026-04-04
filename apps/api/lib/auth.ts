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
