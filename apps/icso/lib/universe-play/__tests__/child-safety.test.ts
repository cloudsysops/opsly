import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { FORBIDDEN_EXPLORER_FIELDS } from '../play-types';

const here = dirname(fileURLToPath(import.meta.url));
const playRoot = join(here, '../../../components/universe-play');

function readPlaySources(): string {
  const names = readdirSync(playRoot);
  return names
    .filter((name) => name.endsWith('.tsx') || name.endsWith('.ts') || name.endsWith('.css'))
    .map((name) => readFileSync(join(playRoot, name), 'utf8'))
    .join('\n');
}

describe('First Portal child safety', () => {
  it('does not collect direct PII fields', () => {
    const source = readPlaySources();
    for (const field of FORBIDDEN_EXPLORER_FIELDS) {
      expect(source).not.toMatch(new RegExp(`name=["']${field}["']`));
      expect(source).not.toMatch(new RegExp(`htmlFor=["']${field}["']`));
    }
    expect(source).not.toMatch(/type=["']email["']/);
    expect(source).not.toMatch(/type=["']tel["']/);
  });

  it('does not add chat, ads, or player outbound links', () => {
    const source = readPlaySources();
    expect(source).not.toMatch(/\bchat\b/i);
    expect(source).not.toMatch(/\bdiscord\b/i);
    expect(source).not.toMatch(/\bwhatsapp\b/i);
    expect(source).not.toMatch(/mailto:/);
    expect(source).not.toMatch(/target=["']_blank["']/);
    expect(source).not.toMatch(/href=["']https?:\/\//);
  });
});
