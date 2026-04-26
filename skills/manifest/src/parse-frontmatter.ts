/**
 * Frontmatter YAML mínimo (pares clave: valor por línea) entre --- y ---.
 * Sin dependencias externas; suficiente para name, version, description.
 */
export function parseSimpleFrontmatter(markdown: string): {
  frontmatter: Record<string, string>;
  body: string;
} {
  const trimmed = markdown.replace(/^\uFEFF/, '');
  if (!trimmed.startsWith('---\n')) {
    return { frontmatter: {}, body: markdown };
  }
  const rest = trimmed.slice(4);
  const endIdx = rest.indexOf('\n---\n');
  if (endIdx === -1) {
    return { frontmatter: {}, body: markdown };
  }
  const block = rest.slice(0, endIdx);
  const body = rest.slice(endIdx + 5);
  const frontmatter: Record<string, string> = {};
  for (const line of block.split('\n')) {
    const m = /^([a-zA-Z0-9_-]+):\s*(.*)$/.exec(line);
    if (!m) {
      continue;
    }
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    frontmatter[m[1]] = val;
  }
  return { frontmatter, body };
}
