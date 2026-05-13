/**
 * MCP Tool: Obsidian Brain Search + Semantic
 * Fulltext + semantic similarity search of vault
 */

import { searchNotes, getNote } from './search.js';
import { semanticSearch, loadEmbeddingsIndex } from './embeddings.js';

export const ObsidianTools = {
  'brain:search': {
    description:
      'Search Obsidian vault (docs/brain) by query, tags, or links. Returns top 10 matches with context.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query (fulltext, tags, wikilinks)',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter results by tags (AND logic)',
        },
        limit: {
          type: 'number',
          description: 'Max results (default 10, max 20)',
        },
      },
      required: ['query'],
    },
    handler: async (input: { query: string; tags?: string[]; limit?: number }) => {
      const results = searchNotes(input.query, { tags: input.tags });
      const limited = results.slice(0, Math.min(input.limit || 10, 20));

      return {
        query: input.query,
        total: results.length,
        results: limited.map((r) => ({
          path: r.note.path,
          title: r.note.title,
          score: r.score,
          matches: r.matches,
          preview: r.note.content.substring(0, 200).replace(/\n/g, ' ') + '...',
        })),
      };
    },
  },

  'brain:get': {
    description: 'Retrieve full content of a note from Obsidian vault by path.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to note (e.g., "agents/claude.md" or "architecture/overview.md")',
        },
      },
      required: ['path'],
    },
    handler: async (input: { path: string }) => {
      const note = getNote(input.path);
      if (!note) {
        return {
          error: `Note not found: ${input.path}`,
          suggestions: ['Check path spelling', 'Use brain:search to find notes'],
        };
      }

      return {
        path: note.path,
        title: note.title,
        tags: note.tags,
        links: note.links,
        content: note.content,
        lastModified: new Date(note.lastModified).toISOString(),
      };
    },
  },

  'brain:list-tags': {
    description: 'List all tags in vault for filtering searches.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    handler: async () => {
      const notes = buildIndex();
      const tagMap: Record<string, number> = {};

      for (const note of notes) {
        for (const tag of note.tags) {
          tagMap[tag] = (tagMap[tag] || 0) + 1;
        }
      }

      const sorted = Object.entries(tagMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 30);

      return {
        totalTags: Object.keys(tagMap).length,
        topTags: sorted.map(([tag, count]) => ({ tag, count })),
      };
    },
  },

  'brain:graph': {
    description: 'Get knowledge graph: notes linked to query (1-hop or 2-hop distance).',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Central note or concept',
        },
        depth: {
          type: 'number',
          description: 'Link depth (1 or 2, default 1)',
          enum: [1, 2],
        },
      },
      required: ['query'],
    },
    handler: async (input: { query: string; depth?: number }) => {
      const depth = input.depth || 1;
      const results = searchNotes(input.query);
      if (results.length === 0) {
        return { error: `No notes found for: ${input.query}` };
      }

      const central = results[0].note;
      const graph: Record<string, string[]> = {};
      graph[central.path] = central.links;

      // 1-hop: immediate links
      const neighbors = new Set(central.links);

      // 2-hop if requested
      if (depth === 2) {
        for (const link of neighbors) {
          const linked = getNote(link);
          if (linked) {
            graph[link] = linked.links;
            linked.links.forEach((l) => neighbors.add(l));
          }
        }
      }

      return {
        central: { path: central.path, title: central.title },
        depth,
        nodes: Array.from(neighbors).slice(0, 20),
        graph,
      };
    },
  },

  'brain:semantic-search': {
    description:
      'Semantic similarity search (embeddings). Finds conceptually similar notes, not just keyword matches.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query (concept, natural language)',
        },
        limit: {
          type: 'number',
          description: 'Max results (default 10, max 20)',
        },
      },
      required: ['query'],
    },
    handler: async (input: { query: string; limit?: number }) => {
      const index = loadEmbeddingsIndex();
      if (!index) {
        return {
          error: 'Embeddings not indexed yet',
          hint: 'Run: npm run brain:embeddings',
        };
      }

      const results = await semanticSearch(input.query, Math.min(input.limit || 10, 20));

      return {
        query: input.query,
        model: 'all-MiniLM-L6-v2 (local)',
        total: results.length,
        results: results.map((r) => ({
          path: r.note.path,
          title: r.note.title,
          similarity: (r.score * 100).toFixed(1) + '%',
          matches: r.matches,
          preview: r.note.chunks[0]?.text.substring(0, 150) + '...',
        })),
      };
    },
  },
};

// Helper
import { buildIndex } from './search.js';
