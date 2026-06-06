import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { getRuleSearchRoots } from './paths.js';
import type { SigmaRuleLevel, SigmaRuleSummary } from './types.js';

interface RawSigmaRule {
  id?: string;
  title?: string;
  level?: string;
  status?: string;
  description?: string;
  tags?: string[];
  logsource?: Record<string, string>;
}

const LEVELS: SigmaRuleLevel[] = ['informational', 'low', 'medium', 'high', 'critical'];

function normalizeLevel(value: string | undefined): SigmaRuleLevel {
  const lower = (value ?? 'medium').toLowerCase();
  if (LEVELS.includes(lower as SigmaRuleLevel)) {
    return lower as SigmaRuleLevel;
  }
  return 'medium';
}

function walkYamlFiles(dir: string, acc: string[] = []): string[] {
  if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) {
    return acc;
  }
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      walkYamlFiles(full, acc);
    } else if (entry.endsWith('.yml') || entry.endsWith('.yaml')) {
      acc.push(full);
    }
  }
  return acc;
}

function parseRuleFile(filePath: string): SigmaRuleSummary | null {
  try {
    const raw = readFileSync(filePath, 'utf8');
    const doc = parseYaml(raw) as RawSigmaRule;
    const id = doc.id?.trim() || path.basename(filePath, path.extname(filePath));
    const title = doc.title?.trim() || id;
    return {
      id,
      title,
      level: normalizeLevel(doc.level),
      status: doc.status,
      description: doc.description,
      tags: Array.isArray(doc.tags) ? doc.tags.map(String) : [],
      logsource: doc.logsource,
      filePath,
    };
  } catch {
    return null;
  }
}

let cachedIndex: SigmaRuleSummary[] | null = null;

export function loadRuleIndex(options?: { force?: boolean }): SigmaRuleSummary[] {
  if (cachedIndex && !options?.force) {
    return cachedIndex;
  }
  const roots = getRuleSearchRoots();
  const files: string[] = [];
  for (const root of roots) {
    walkYamlFiles(root, files);
  }
  const rules: SigmaRuleSummary[] = [];
  for (const file of files) {
    const parsed = parseRuleFile(file);
    if (parsed) {
      rules.push(parsed);
    }
  }
  cachedIndex = rules;
  return rules;
}

export function searchRules(query: string, limit = 25): SigmaRuleSummary[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return [];
  }
  const index = loadRuleIndex();
  const scored = index
    .map((rule) => {
      const haystack = [
        rule.id,
        rule.title,
        rule.description ?? '',
        ...rule.tags,
      ]
        .join(' ')
        .toLowerCase();
      const score = haystack.includes(q) ? 1 : 0;
      return { rule, score };
    })
    .filter((item) => item.score > 0)
    .slice(0, limit)
    .map((item) => item.rule);
  return scored;
}

export function findRulesForText(text: string, limit = 10): SigmaRuleSummary[] {
  const tokens = text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 4)
    .slice(0, 12);
  if (tokens.length === 0) {
    return [];
  }
  const index = loadRuleIndex();
  const ranked = index
    .map((rule) => {
      const haystack = [rule.title, rule.description ?? '', ...rule.tags].join(' ').toLowerCase();
      const hits = tokens.filter((token) => haystack.includes(token)).length;
      return { rule, hits };
    })
    .filter((item) => item.hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .slice(0, limit)
    .map((item) => item.rule);
  return ranked;
}

export function getRulesByIds(ids: string[]): SigmaRuleSummary[] {
  const wanted = new Set(ids);
  return loadRuleIndex().filter((rule) => wanted.has(rule.id));
}

export function clearRuleIndexCache(): void {
  cachedIndex = null;
}
