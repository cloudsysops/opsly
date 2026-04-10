/**
 * Memoria a largo plazo (Opsly Brain): pgvector + embeddings OpenAI.
 * Tabla `public.opsly_knowledge_store` (ver migración SQL). Compatible con sustituir el
 * almacenamiento interno por `PGVectorStore` de `@llamaindex/postgres` cuando se unifique el embed model.
 */
import pg from "pg";

const TABLE = "opsly_knowledge_store";
const EMBED_MODEL = "text-embedding-3-small";
const EMBED_DIM = 1536;
const TOP_K = 5;

let pool: pg.Pool | null = null;
let schemaEnsured = false;

function getDatabaseUrl(): string | null {
  const u = process.env.DATABASE_URL?.trim();
  return u && u.length > 0 ? u : null;
}

function getPool(): pg.Pool | null {
  const url = getDatabaseUrl();
  if (!url) {
    return null;
  }
  if (!pool) {
    pool = new pg.Pool({ connectionString: url, max: 4 });
  }
  return pool;
}

async function ensureSchema(client: pg.PoolClient): Promise<void> {
  if (schemaEnsured) {
    return;
  }
  await client.query("CREATE EXTENSION IF NOT EXISTS vector");
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.${TABLE} (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      content text NOT NULL,
      metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
      embedding vector(${EMBED_DIM}) NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  try {
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_${TABLE}_embedding
      ON public.${TABLE}
      USING hnsw (embedding vector_cosine_ops)
    `);
  } catch {
    /* índice opcional si la versión de pgvector no soporta HNSW en este entorno */
  }
  schemaEnsured = true;
}

async function embedText(text: string): Promise<number[]> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    throw new Error("OPENAI_API_KEY requerido para embeddings de knowledge-base");
  }
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBED_MODEL,
      input: text.slice(0, 8000),
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`embeddings HTTP ${res.status}: ${t.slice(0, 200)}`);
  }
  const body = (await res.json()) as {
    data?: { embedding?: number[] }[];
  };
  const emb = body.data?.[0]?.embedding;
  if (!emb || emb.length !== EMBED_DIM) {
    throw new Error("embedding inválido");
  }
  return emb;
}

function vectorLiteral(values: number[]): string {
  return `[${values.join(",")}]`;
}

/**
 * Inserta un documento con embedding (memoria global Opsly Brain).
 */
export async function indexDocument(
  text: string,
  metadata: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string }> {
  const p = getPool();
  if (!p) {
    return { ok: false, error: "DATABASE_URL no configurado" };
  }
  const client = await p.connect();
  try {
    await ensureSchema(client);
    const emb = await embedText(text);
    await client.query(
      `INSERT INTO public.${TABLE} (content, metadata, embedding)
       VALUES ($1, $2::jsonb, $3::vector)`,
      [text, JSON.stringify(metadata), vectorLiteral(emb)],
    );
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  } finally {
    client.release();
  }
}

/**
 * Recupera trozos de texto relevantes para el query (similaridad coseno).
 */
export async function retrieve(query: string): Promise<string[]> {
  const q = query.trim();
  if (q.length === 0) {
    return [];
  }
  const p = getPool();
  if (!p) {
    return [];
  }
  const client = await p.connect();
  try {
    await ensureSchema(client);
    const emb = await embedText(q);
    const vec = vectorLiteral(emb);
    const { rows } = await client.query<{ content: string }>(
      `SELECT content FROM public.${TABLE}
       ORDER BY embedding <=> $1::vector
       LIMIT $2`,
      [vec, TOP_K],
    );
    return rows.map((r) => r.content);
  } catch (e) {
    process.stderr.write(
      `[knowledge-base] retrieve: ${e instanceof Error ? e.message : String(e)}\n`,
    );
    return [];
  } finally {
    client.release();
  }
}
