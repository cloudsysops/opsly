import { readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const appRoot = resolve(dirname(new URL(import.meta.url).pathname), '../..');
const forbidden = /\b(?:nivel(?:es)?|level(?:s)?|grado(?:s)?|grade(?:s)?)\b/i;
const copyModules = new Set([
  'lib/brand.ts',
  'lib/instagram-feed.ts',
  'lib/peskids-intake-messages.ts',
  'lib/agents/lead-followup.service.ts',
]);

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (['.next', 'migrations', 'node_modules', '__tests__'].includes(entry.name)) return [];
      return sourceFiles(path);
    }
    const relativePath = relative(appRoot, path);
    return extname(path) === '.tsx' || copyModules.has(relativePath) ? [path] : [];
  });
}

function visibleStrings(path: string): string[] {
  const source = readFileSync(path, 'utf8');
  if (!forbidden.test(source)) return [];
  const sourceFile = ts.createSourceFile(
    path,
    source,
    ts.ScriptTarget.Latest,
    true,
    path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );
  const strings: string[] = [];
  const scanAllStrings = copyModules.has(relative(appRoot, path));

  function isRenderedExpressionString(node: ts.Node): boolean {
    let current = node.parent;
    while (current && !ts.isJsxExpression(current)) {
      if (
        ts.isJsxAttribute(current) ||
        ts.isCallExpression(current) ||
        ts.isFunctionLike(current) ||
        ts.isObjectLiteralExpression(current) ||
        ts.isArrayLiteralExpression(current)
      ) {
        return false;
      }
      current = current.parent;
    }
    return Boolean(current && !ts.isJsxAttribute(current.parent));
  }

  function visit(node: ts.Node): void {
    if (ts.isJsxText(node) && node.getText(sourceFile).trim()) {
      strings.push(node.getText(sourceFile).trim());
    }
    if (
      ts.isJsxAttribute(node) &&
      ['placeholder', 'title', 'aria-label', 'alt'].includes(node.name.getText(sourceFile)) &&
      node.initializer &&
      ts.isStringLiteral(node.initializer)
    ) {
      strings.push(node.initializer.text);
    }
    if (
      ts.isStringLiteralLike(node) &&
      (scanAllStrings || isRenderedExpressionString(node))
    ) {
      strings.push(node.text);
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return strings;
}

describe('Peskids visible domain language', () => {
  it('does not expose academic level or grade terminology', () => {
    const violations = sourceFiles(appRoot).flatMap((path) =>
      visibleStrings(path)
        .filter((text) => forbidden.test(text))
        .map((text) => `${relative(appRoot, path)}: ${text}`)
    );

    expect(violations).toEqual([]);
  });
});
