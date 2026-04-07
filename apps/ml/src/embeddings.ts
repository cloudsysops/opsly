export async function embedText(_text: string): Promise<number[]> {
  throw new Error("Embeddings endpoint pendiente — definir proveedor en ADR futuro");
}

export async function storeEmbedding(
  tenantSlug: string,
  content: string,
  metadata: Record<string, unknown>
): Promise<void> {
  const payloadPreview = {
    tenantSlug,
    contentLength: content.length,
    metadataKeys: Object.keys(metadata)
  };
  process.stdout.write(`[ml] storeEmbedding pending: ${JSON.stringify(payloadPreview)}\n`);
}
