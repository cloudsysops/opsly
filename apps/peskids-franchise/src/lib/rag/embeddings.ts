// Lazy-load OpenAI client to avoid loading SDK at startup
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let openai: any = null;

function getOpenAI() {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not set");
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const OpenAI = require("openai").default;
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

// Demo mode: return zero-vector embeddings when no API key
const DEMO_MODE = !process.env.OPENAI_API_KEY;
const DEMO_EMBEDDING_DIM = 1536; // text-embedding-3-small dimension

export async function generateEmbedding(text: string): Promise<number[]> {
  if (DEMO_MODE) {
    console.log("[DEMO] OpenAI not configured — returning zero-vector embedding");
    return new Array(DEMO_EMBEDDING_DIM).fill(0);
  }
  const response = await getOpenAI().embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });

  return response.data[0].embedding;
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (DEMO_MODE) {
    console.log("[DEMO] OpenAI not configured — returning zero-vector embeddings");
    return texts.map(() => new Array(DEMO_EMBEDDING_DIM).fill(0));
  }
  const response = await getOpenAI().embeddings.create({
    model: "text-embedding-3-small",
    input: texts,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return response.data.map((d: any) => d.embedding);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
