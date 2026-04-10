export function parseTenantIdFromJsonBody(body: unknown): string | null {
  if (
    body === null ||
    typeof body !== "object" ||
    !("tenant_id" in body) ||
    typeof (body as { tenant_id: unknown }).tenant_id !== "string"
  ) {
    return null;
  }
  const id = (body as { tenant_id: string }).tenant_id.trim();
  return id.length > 0 ? id : null;
}
