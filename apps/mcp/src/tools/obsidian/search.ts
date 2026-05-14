import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

const VAULT_PATH = join(process.cwd(), 'docs/brain');

interface Note {
  path: string;
  title: string;
  content: string;
  tags: string[];
  links: string[];
  lastModified: number;
}

interface SearchResult {
  note: Note;
  score: number;
  matches: string[];
}

// Index notes from vault
function buildIndex(): Note[] {
  const notes: Note[] = [];

  function walkDir(dir: string, prefix = '') {
    if (!existsSync(dir)) return;

    const files = readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
      const fullPath = join(dir, file.name);
      const relPath = prefix ? `${prefix}/${file.name}` : file.name;

      if (file.isDirectory()) {
        walkDir(fullPath, relPath);
      } else if (file.name.endsWith('.md')) {
        try {
          const content = readFileSync(fullPath, 'utf-8');
          const stat = require('fs').statSync(fullPath);

          // Extract frontmatter tags
          const tagMatch = content.match(/tags:\s*\[(.*?)\]/);
          const tags = tagMatch
            ? tagMatch[1]
                .split(',')
                .map((t) => t.trim().replace(/['"]/g, ''))
            : [];

          // Extract wikilinks
          const linkMatches = content.match(/\[\[(.*?)\]\]/g) || [];
          const links = linkMatches.map((l) => l.replace(/\[\[|\]\]/g, ''));

          // Extract title from heading or filename
          const titleMatch = content.match(/^#\s+(.+)$/m);
          const title = titleMatch ? titleMatch[1] : file.name.replace('.md', '');

          notes.push({
            path: relPath,
            title,
            content,
            tags,
            links,
            lastModified: stat.mtimeMs,
          });
        } catch (e) {
          console.error(`Error reading ${fullPath}:`, e);
        }
      }
    }
  }

  walkDir(VAULT_PATH);
  return notes;
}

// Search index with scoring
function searchNotes(query: string, options?: { tags?: string[] }): SearchResult[] {
  const notes = buildIndex();
  const q = query.toLowerCase();
  const words = q.split(/\s+/).filter(Boolean);

  const results = notes
    .map((note) => {
      let score = 0;
      const matches: string[] = [];

      // Title match (strongest)
      if (note.title.toLowerCase().includes(q)) {
        score += 50;
        matches.push(`title: "${note.title}"`);
      }

      // Tag match
      for (const tag of note.tags) {
        if (tag.toLowerCase().includes(q)) {
          score += 30;
          matches.push(`tag: #${tag}`);
        }
      }

      // Content matches
      for (const word of words) {
        const count = (note.content.match(new RegExp(word, 'gi')) || []).length;
        score += count * 2;
        if (count > 0) matches.push(`${count}x "${word}"`);
      }

      // Link match
      for (const link of note.links) {
        if (link.toLowerCase().includes(q)) {
          score += 20;
          matches.push(`links to: ${link}`);
        }
      }

      // Filter by tags if provided
      if (options?.tags?.length) {
        const hasTag = options.tags.some((t) => note.tags.includes(t));
        if (!hasTag) score = 0;
      }

      return { note, score, matches: matches.slice(0, 3) };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);

  return results.slice(0, 10);
}

// Get note by path
function getNote(path: string): Note | null {
  const fullPath = join(VAULT_PATH, path);
  if (!existsSync(fullPath)) return null;

  try {
    const content = readFileSync(fullPath, 'utf-8');
    const stat = require('fs').statSync(fullPath);

    const tagMatch = content.match(/tags:\s*\[(.*?)\]/);
    const tags = tagMatch
      ? tagMatch[1]
          .split(',')
          .map((t) => t.trim().replace(/['"]/g, ''))
      : [];

    const linkMatches = content.match(/\[\[(.*?)\]\]/g) || [];
    const links = linkMatches.map((l) => l.replace(/\[\[|\]\]/g, ''));

    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : path.split('/').pop() || '';

    return { path, title, content, tags, links, lastModified: stat.mtimeMs };
  } catch (e) {
    return null;
  }
}

export { searchNotes, getNote, buildIndex, Note, SearchResult };
