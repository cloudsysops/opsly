// Endpoint de información de versión — GET /api/v1
// Este path es reescrito por el middleware a /api/v1 antes de llegar aquí.
export function GET(): Response {
  return Response.json({
    version: "1",
    status: "stable",
    docs: "/api/docs",
    openapi: "/openapi.yaml",
  });
}

export const runtime = "edge";
