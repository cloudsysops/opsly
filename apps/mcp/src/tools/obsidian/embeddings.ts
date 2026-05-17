/**
 * Semantic search over pre-built vault embeddings (docs/brain/.embeddings.json).
 * Index generation: `npm run brain:embeddings` (scripts/brain-embeddings-index.js).
 * Query scoring uses the same deterministic hash vectors as the indexer (no ONNX runtime in MCP).
 */

import { readFileSync, existsSync } from 'fs';

const EMBEDDINGS_PATH = 'docs/brain/.embeddings.json';
const EMBEDDING_DIM = 384;

interface EmbeddedNote {
  path: string;
  title: string;
  chunks: {
    text: string;
    embedding: number[];
    position: number;
  }[];
  fullEmbedding: number[];
}

interface EmbeddingsIndex {
  version: '1.0';
  model: string;
  dimension: number;
  generated: string;
  notes: EmbeddedNote[];
}

function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, av, i) => sum + av * b[i], 0);
  const normA = Math.sqrt(a.reduce((sum, av) => sum + av * av, 0));
  const normB = Math.sqrt(b.reduce((sum, bv) => sum + bv * bv, 0));
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (normA * normB);
}

function fakeEmbedding(text: string): number[] {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  const arr = new Array<number>(EMBEDDING_DIM).fill(0);
  for (let i = 0; i < EMBEDDING_DIM; i++) {
    arr[i] = Math.sin(hash + i) / Math.sqrt(EMBEDDING_DIM);
  }
  return arr;
}

export function chunkText(text: string, maxTokens = 100): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks: string[] = [];
  let current = '';

  for (const sent of sentences) {
    const combined = current + sent;
    if (combined.split(/\s+/).length > maxTokens) {
      if (current) chunks.push(current.trim());
      current = sent;
    } else {
      current = combined;
    }
  }

  if (current) chunks.push(current.trim());
  return chunks;
}

export async function buildEmbeddingsIndex(): Promise<EmbeddingsIndex> {
  throw new Error(
    'Use npm run brain:embeddings from repo root (scripts/brain-embeddings-index.js). MCP does not bundle ONNX.'
  );
}

export function loadEmbeddingsIndex(): EmbeddingsIndex | null {
  if (!existsSync(EMBEDDINGS_PATH)) return null;
  return JSON.parse(readFileSync(EMBEDDINGS_PATH, 'utf-8')) as EmbeddingsIndex;
}

export async function semanticSearch(
  query: string,
  topK = 10
): Promise<Array<{ note: EmbeddedNote; score: number; matches: string[] }>> {
  const index = loadEmbeddingsIndex();
  if (!index) {
    console.error('No embeddings index found. Run: npm run brain:embeddings');
    return [];
  }

  const queryEmbedding = fakeEmbedding(query);

  const scored = index.notes
    .map((note) => {
      const score = cosineSimilarity(queryEmbedding, note.fullEmbedding);
      const chunkMatches = note.chunks
        .map((c) => ({
          similarity: cosineSimilarity(queryEmbedding, c.embedding),
          text: c.text,
        }))
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 3)
        .map((m) => `${m.text.substring(0, 60)}...`);

      return { note, score, matches: chunkMatches };
    })
    .filter((r) => r.score > 0.3)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return scored;
}

export { cosineSimilarity };
