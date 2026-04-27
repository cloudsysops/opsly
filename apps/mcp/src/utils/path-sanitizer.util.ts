import path from 'node:path';

export function sanitizePath(relativePath: string, baseRoot: string): string {
  const safeBaseRoot = path.resolve(baseRoot);
  const absolutePath = path.resolve(safeBaseRoot, relativePath);

  const relativeToBase = path.relative(safeBaseRoot, absolutePath);
  const escapedBase =
    relativeToBase.startsWith('..') || path.isAbsolute(relativeToBase) || relativeToBase === '';

  if (escapedBase && absolutePath !== safeBaseRoot) {
    throw new Error('Path Traversal Detected');
  }

  return absolutePath;
}
