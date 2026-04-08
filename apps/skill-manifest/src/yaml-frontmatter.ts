export function parseYamlLikeFrontmatter(block: string): {
  name?: string;
  version?: string;
  description?: string;
} {
  const out: { name?: string; version?: string; description?: string } = {};
  for (const line of block.split("\n")) {
    const m = /^([a-zA-Z0-9_-]+):\s*(.*)$/.exec(line);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (key === "name") out.name = val;
    else if (key === "version") out.version = val;
    else if (key === "description") out.description = val;
  }
  return out;
}

export function yamlFrontmatterLooksPopulated(m: {
  name?: string;
  version?: string;
  description?: string;
}): boolean {
  return m.name !== undefined || m.version !== undefined || m.description !== undefined;
}
