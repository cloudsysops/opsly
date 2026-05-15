import { minimatch } from 'minimatch';

import type {
  ArchitectureViolation,
  FileChange,
  RepoGovernanceConfig,
  RepoIntelligenceSnapshot,
} from './types.js';

function topLevelDir(path: string): string | null {
  const parts = path.split('/');
  return parts.length > 1 ? parts[0] : null;
}

export function validateArchitecture(
  changes: FileChange[],
  config: RepoGovernanceConfig,
  intelligence: RepoIntelligenceSnapshot,
): ArchitectureViolation[] {
  const violations: ArchitectureViolation[] = [];
  const paths = changes.map((c) => c.path);

  for (const change of changes) {
    if (change.status !== 'added') {
      continue;
    }
    const top = topLevelDir(change.path);
    if (top && config.forbidden_new_top_level.includes(top)) {
      violations.push({
        code: 'FORBIDDEN_TOP_LEVEL',
        severity: 'error',
        message: `New top-level directory "${top}" is forbidden. Extend existing structure.`,
        path: change.path,
      });
    }
    if (change.path.endsWith('.md') && !change.path.includes('/')) {
      if (!config.allowed_root_markdown.includes(change.path)) {
        violations.push({
          code: 'ROOT_MARKDOWN',
          severity: 'error',
          message: `Root markdown "${change.path}" not in allowlist.`,
          path: change.path,
        });
      }
    }
  }

  for (const pattern of config.forbidden_duplicate_service_patterns) {
    for (const p of paths) {
      if (minimatch(p, pattern.pattern, { dot: true })) {
        violations.push({
          code: 'DUPLICATE_SERVICE_PATTERN',
          severity: 'error',
          message: pattern.reason,
          path: p,
        });
      }
    }
  }

  const newOrchestratorRoots = changes.filter(
    (c) =>
      c.status === 'added' &&
      (c.path.startsWith('apps/orchestrator-') ||
        c.path.match(/^apps\/[^/]+\/src\/orchestrator\//)),
  );
  if (newOrchestratorRoots.length > 0) {
    violations.push({
      code: 'DUPLICATE_ORCHESTRATOR',
      severity: 'error',
      message: 'Do not create a second orchestrator. Extend apps/orchestrator.',
      path: newOrchestratorRoots[0]?.path,
    });
  }

  const newGatewayRoots = changes.filter(
    (c) =>
      c.status === 'added' &&
      (c.path.startsWith('apps/llm-gateway-') || c.path.includes('/llm-gateway/')),
  );
  const hasCanonGateway = intelligence.apps.includes('llm-gateway');
  if (hasCanonGateway && newGatewayRoots.some((c) => !c.path.startsWith('apps/llm-gateway/'))) {
    violations.push({
      code: 'DUPLICATE_GATEWAY',
      severity: 'error',
      message: 'Do not create a second LLM gateway. Extend apps/llm-gateway.',
      path: newGatewayRoots[0]?.path,
    });
  }

  if (intelligence.architecture_docs_missing.length > 0) {
    violations.push({
      code: 'ARCH_DOCS_MISSING',
      severity: 'warning',
      message: `Missing architecture docs: ${intelligence.architecture_docs_missing.join(', ')}`,
    });
  }

  return violations;
}
