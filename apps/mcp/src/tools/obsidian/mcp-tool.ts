/**
 * MCP Tool: Obsidian Brain Search + Semantic + Research Agent
 * Fulltext + semantic similarity search + autonomous investigation
 */

import { searchNotes, getNote } from './search.js';
import { semanticSearch, loadEmbeddingsIndex } from './embeddings.js';
import Anthropic from '@anthropic-ai/sdk';

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

  'brain:research': {
    description:
      'Autonomous research agent. Iteratively investigates the brain by searching, synthesizing facts, and deepening investigation until confident enough to answer.',
    inputSchema: {
      type: 'object',
      properties: {
        question: {
          type: 'string',
          description: 'Research question (e.g., "How is tenant isolation designed?")',
        },
        maxIterations: {
          type: 'number',
          description: 'Max investigation cycles (default 5, min 1, max 10)',
        },
        confidenceThreshold: {
          type: 'number',
          description: 'Confidence level to stop investigation (0-1, default 0.8)',
        },
      },
      required: ['question'],
    },
    handler: async (input: {
      question: string;
      maxIterations?: number;
      confidenceThreshold?: number;
    }) => {
      const client = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });

      const maxIterations = Math.min(input.maxIterations || 5, 10);
      const confidenceThreshold = input.confidenceThreshold || 0.8;
      const sources = new Set<string>();
      let currentQuestion = input.question;
      let iterations = 0;
      let confidence = 0;
      let answer = '';

      while (iterations < maxIterations) {
        iterations++;

        // Search using both methods
        const fulltext = searchNotes(currentQuestion);
        const index = loadEmbeddingsIndex();
        let semantic: Array<{ note: any; score: number; matches: string[] }> = [];
        if (index) {
          semantic = await semanticSearch(currentQuestion, 5);
        }

        if (fulltext.length === 0 && semantic.length === 0) break;

        // Combine and rank results
        const combined = [
          ...fulltext.slice(0, 3).map((r) => ({ ...r, method: 'fulltext' })),
          ...semantic.slice(0, 3).map((r) => ({
            score: r.score,
            note: r.note,
            matches: r.matches,
            method: 'semantic',
          })),
        ];

        const unique = Array.from(
          new Map(combined.map((r) => [r.note.path, r])).values()
        ).slice(0, 5);

        // Extract facts
        const facts = unique
          .map((r) => `[${r.note.path}] ${r.note.title}: ${r.matches?.[0] || r.note.content.substring(0, 100)}`)
          .join('\n');

        unique.forEach((r) => sources.add(r.note.path));

        // Synthesize
        const prompt = `
Question: ${currentQuestion}

Available Facts:
${facts}

Provide a concise answer based on these facts. Estimate your confidence (0-1) in this answer.

Format:
ANSWER: [your answer]
CONFIDENCE: [0.0-1.0]
`;

        const response = await client.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 300,
          messages: [{ role: 'user', content: prompt }],
        });

        const text =
          response.content[0].type === 'text' ? response.content[0].text : '';

        const answerMatch = text.match(/ANSWER:\s*(.+?)(?=CONFIDENCE:|$)/s);
        const confidenceMatch = text.match(/CONFIDENCE:\s*([0-9.]+)/);

        answer = answerMatch ? answerMatch[1].trim() : text;
        confidence = confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.5;

        if (confidence >= confidenceThreshold) break;

        // Generate follow-up
        const followUpPrompt = `
Original question: ${input.question}
Current facts: ${facts}

Generate a follow-up search query to deepen investigation.
Be specific and search for related concepts not yet covered.
`;

        const followUpResponse = await client.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 50,
          messages: [{ role: 'user', content: followUpPrompt }],
        });

        currentQuestion =
          followUpResponse.content[0].type === 'text'
            ? followUpResponse.content[0].text
            : input.question;
      }

      const relatedTopics = Array.from(sources)
        .map((s) => s.split('/').pop()?.replace('.md', '') || '')
        .filter(Boolean)
        .slice(0, 5);

      return {
        question: input.question,
        answer,
        sources: Array.from(sources).slice(0, 5),
        confidence: Math.min(confidence, 1.0),
        iterations,
        relatedTopics,
      };
    },
  },
};

// Helper
import { buildIndex } from './search.js';
