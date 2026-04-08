/** Embeddings OpenAI text-embedding-3-small (1536) para cache semántico y RAG. */

type OpenAiEmbeddingsResponse = {
  data?: Array<{ embedding: number[] }>;
  error?: { message?: string };
};

export async function embedText(text: string): Promise<number[] | null> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    return null;
  }
  const input = text.length > 8000 ? text.slice(0, 8000) : text;
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input,
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    console.warn("[llm-gateway] embeddings HTTP", res.status);
    return null;
  }
  const data = (await res.json()) as OpenAiEmbeddingsResponse;
  const emb = data.data?.[0]?.embedding;
  if (!emb || emb.length !== 1536) {
    return null;
  }
  return emb;
}
