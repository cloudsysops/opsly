/**
 * Semantic embeddings for Obsidian notes (local, free)
 * Uses @xenova/transformers (ONNX model)
 */

import { pipeline } from '@xenova/transformers';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const VAULT_PATH = 'docs/brain';
const EMBEDDINGS_PATH = 'docs/brain/.embeddings.json';
const EMBEDDING_DIM = 384; // all-MiniLM-L6-v2 dimension

interface EmbeddedNote {
  path: string;
  title: string;
  chunks: {
    text: string;
    embedding: number[];
    position: number;
  }[];
  fullEmbedding: number[]; // average of chunks
}

interface EmbeddingsIndex {
  version: '1.0';
  model: 'all-MiniLM-L6-v2';
  dimension: number;
  generated: string;
  notes: EmbeddedNote[];
}

// Cosine similarity between two vectors
function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, av, i) => sum + av * b[i], 0);
  const normA = Math.sqrt(a.reduce((sum, av) => sum + av * av, 0));
  const normB = Math.sqrt(b.reduce((sum, bv) => sum + bv * bv, 0));
  return dotProduct / (normA * normB);
}

// Average embedding
function averageEmbeddings(embeddings: number[][]): number[] {
  const avg = new Array(embeddings[0].length).fill(0);
  for (const emb of embeddings) {
    for (let i = 0; i < emb.length; i++) {
      avg[i] += emb[i];
    }
  }
  return avg.map((v) => v / embeddings.length);
}

// Split text into chunks (sentences)
function chunkText(text: string, maxTokens = 100): string[] {
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

// Generate embeddings for a note
async function embedNote(
  path: string,
  title: string,
  content: string,
  extractor: any
): Promise<EmbeddedNote> {
  const chunks = chunkText(content);
  const embeddedChunks: { text: string; embedding: number[]; position: number }[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const text = chunks[i];
    const result = await extractor(text, { pooling: 'mean', normalize: true });
    const embedding = Array.from(result.data) as number[];
    embeddedChunks.push({ text, embedding, position: i });
  }

  const fullEmbedding = averageEmbeddings(embeddedChunks.map((c) => c.embedding));

  return {
    path,
    title,
    chunks: embeddedChunks,
    fullEmbedding,
  };
}

// Build full index
export async function buildEmbeddingsIndex(): Promise<EmbeddingsIndex> {
  console.log('🧠 Generating embeddings (this may take a minute...)');

  const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  const notes: EmbeddedNote[] = [];

  function walkDir(dir: string, prefix = '') {
    if (!existsSync(dir)) return;

    const files = require('fs').readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
      const fullPath = join(dir, file.name);
      const relPath = prefix ? `${prefix}/${file.name}` : file.name;

      if (file.isDirectory()) {
        walkDir(fullPath, relPath);
      } else if (file.name.endsWith('.md') && file.name !== '.embeddings.json') {
        try {
          const content = readFileSync(fullPath, 'utf-8');
          const titleMatch = content.match(/^#\s+(.+)$/m);
          const title = titleMatch ? titleMatch[1] : file.name;

          console.log(`  ⚡ ${relPath}`);

          // Synchronous wrapper (for now, embeddings are blocking)
          require('deasync').loopWhile(() => {
            embedNote(relPath, title, content, extractor).then((result) => {
              notes.push(result);
            });
            return notes.length === 0;
          });
        } catch (e) {
          console.error(`  ❌ ${relPath}: ${e}`);
        }
      }
    }
  }

  walkDir(VAULT_PATH);

  const index: EmbeddingsIndex = {
    version: '1.0',
    model: 'all-MiniLM-L6-v2',
    dimension: EMBEDDING_DIM,
    generated: new Date().toISOString(),
    notes,
  };

  writeFileSync(EMBEDDINGS_PATH, JSON.stringify(index, null, 2));
  console.log(`\n✅ Indexed ${notes.length} notes with embeddings`);

  return index;
}

// Load index
export function loadEmbeddingsIndex(): EmbeddingsIndex | null {
  if (!existsSync(EMBEDDINGS_PATH)) return null;
  return JSON.parse(readFileSync(EMBEDDINGS_PATH, 'utf-8'));
}

// Semantic search
export async function semanticSearch(
  query: string,
  topK = 10
): Promise<Array<{ note: EmbeddedNote; score: number; matches: string[] }>> {
  const index = loadEmbeddingsIndex();
  if (!index) {
    console.error('No embeddings index found. Run: npm run brain:embeddings');
    return [];
  }

  const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  const result = await extractor(query, { pooling: 'mean', normalize: true });
  const queryEmbedding = Array.from(result.data);

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
        .map((m) => m.text.substring(0, 60) + '...');

      return { note, score, matches: chunkMatches };
    })
    .filter((r) => r.score > 0.3)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return scored;
}

export { cosineSimilarity, chunkText };
