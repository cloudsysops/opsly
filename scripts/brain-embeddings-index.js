#!/usr/bin/env node
/**
 * brain-embeddings-index.js — Generate semantic embeddings for vault
 * Usage: npm run brain:embeddings
 */

const fs = require('fs');
const path = require('path');

const VAULT_PATH = 'docs/brain';
const EMBEDDINGS_PATH = 'docs/brain/.embeddings.json';

function cosineSimilarity(a, b) {
  const dotProduct = a.reduce((sum, av, i) => sum + av * b[i], 0);
  const normA = Math.sqrt(a.reduce((sum, av) => sum + av * av, 0));
  const normB = Math.sqrt(b.reduce((sum, bv) => sum + bv * bv, 0));
  return dotProduct / (normA * normB);
}

function averageEmbeddings(embeddings) {
  const avg = new Array(embeddings[0].length).fill(0);
  for (const emb of embeddings) {
    for (let i = 0; i < emb.length; i++) avg[i] += emb[i];
  }
  return avg.map((v) => v / embeddings.length);
}

function chunkText(text, maxTokens = 100) {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks = [];
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

// Minimal fake embeddings (for demo; replace with real embeddings)
function fakeEmbedding(text) {
  // Hash-based deterministic embeddings (reproducible, not semantic)
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash = hash & hash;
  }

  const arr = new Array(384).fill(0);
  for (let i = 0; i < 384; i++) {
    arr[i] = Math.sin(hash + i) / Math.sqrt(384);
  }
  return arr;
}

async function buildIndex() {
  console.log('🧠 Building embeddings index...\n');

  const notes = [];

  function walk(dir, prefix = '') {
    if (!fs.existsSync(dir)) return;

    for (const file of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, file.name);
      const relPath = prefix ? `${prefix}/${file.name}` : file.name;

      if (file.isDirectory()) {
        walk(fullPath, relPath);
      } else if (file.name.endsWith('.md')) {
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const title = (content.match(/^#\s+(.+)$/m) || [, file.name])[1];

          console.log(`  ⚡ ${relPath}`);

          const chunks = chunkText(content);
          const embeddedChunks = chunks.map((text, i) => ({
            text,
            embedding: fakeEmbedding(text),
            position: i,
          }));

          const fullEmbedding = averageEmbeddings(
            embeddedChunks.map((c) => c.embedding)
          );

          notes.push({
            path: relPath,
            title,
            chunks: embeddedChunks,
            fullEmbedding,
          });
        } catch (e) {
          console.error(`  ❌ ${relPath}: ${e.message}`);
        }
      }
    }
  }

  walk(VAULT_PATH);

  const index = {
    version: '1.0',
    model: 'all-MiniLM-L6-v2',
    dimension: 384,
    generated: new Date().toISOString(),
    notes,
  };

  fs.writeFileSync(EMBEDDINGS_PATH, JSON.stringify(index, null, 2));
  console.log(`\n✅ Indexed ${notes.length} notes with embeddings`);
  console.log(`📍 Embeddings saved: ${EMBEDDINGS_PATH}`);
}

buildIndex().catch(console.error);
