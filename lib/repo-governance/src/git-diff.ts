import type { FileChange } from './types.js';

/** Parse unified diff stat lines from `git diff --numstat` output. */
export function parseNumstat(stdout: string): FileChange[] {
  const changes: FileChange[] = [];
  for (const line of stdout.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    const parts = trimmed.split('\t');
    if (parts.length < 3) {
      continue;
    }
    const addStr = parts[0] ?? '0';
    const delStr = parts[1] ?? '0';
    const path = parts.slice(2).join('\t');
    const additions = addStr === '-' ? 0 : Number.parseInt(addStr, 10) || 0;
    const deletions = delStr === '-' ? 0 : Number.parseInt(delStr, 10) || 0;
    changes.push({
      path,
      status: 'modified',
      additions,
      deletions,
    });
  }
  return changes;
}

/** Parse name-status from `git diff --name-status`. */
export function parseNameStatus(stdout: string): FileChange[] {
  const changes: FileChange[] = [];
  for (const line of stdout.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    const tab = trimmed.indexOf('\t');
    if (tab < 0) {
      continue;
    }
    const code = trimmed.slice(0, tab);
    const rest = trimmed.slice(tab + 1);
    let status: FileChange['status'] = 'modified';
    let path = rest;
    if (code.startsWith('A')) {
      status = 'added';
    } else if (code.startsWith('D')) {
      status = 'deleted';
    } else if (code.startsWith('R') || code.startsWith('C')) {
      status = 'renamed';
      const parts = rest.split('\t');
      path = parts[1] ?? parts[0] ?? rest;
    }
    const existing = changes.find((c) => c.path === path);
    if (existing) {
      existing.status = status;
    } else {
      changes.push({ path, status, additions: 0, deletions: 0 });
    }
  }
  return changes;
}

export function mergeFileChanges(
  numstat: FileChange[],
  nameStatus: FileChange[],
): FileChange[] {
  const byPath = new Map<string, FileChange>();
  for (const c of nameStatus) {
    byPath.set(c.path, { ...c });
  }
  for (const c of numstat) {
    const prev = byPath.get(c.path);
    if (prev) {
      byPath.set(c.path, {
        ...prev,
        additions: c.additions,
        deletions: c.deletions,
      });
    } else {
      byPath.set(c.path, { ...c });
    }
  }
  return [...byPath.values()].sort((a, b) => a.path.localeCompare(b.path));
}
