export type PatternKind = 'harness' | 'tenant' | 'opsly';

export type AgentReviewerRole = 'planner' | 'skeptic' | 'security' | 'validator' | 'architect';

export interface PatternReviewer {
  agent_id: string;
  role: AgentReviewerRole;
}

export interface HarnessPatternOverrides {
  quorumMinReviews?: number;
  consensusThreshold?: number;
}

export interface HarnessPattern {
  id: string;
  kind: 'harness';
  title: string;
  description: string;
  sigmaTags?: string[];
  sigmaQueryHints?: string[];
  reviewers: PatternReviewer[];
  harnessOverrides?: HarnessPatternOverrides;
  proposalTemplate?: {
    topicPrefix?: string;
  };
}

export interface TenantPattern {
  id: string;
  kind: 'tenant';
  title: string;
  description: string;
  stack_type?: string;
  capabilities?: string[];
  modules?: string[];
  harness_patterns?: string[];
  env_prefixes?: string[];
  scripts?: string[];
  routes?: Record<string, string>;
  n8n_pack_id?: string;
  config_refs?: string[];
  compose_template?: string;
}

export interface OpslyPattern {
  id: string;
  kind: 'opsly';
  title: string;
  description: string;
  doc?: string;
  module?: string;
  lib_path?: string;
  structure?: string[];
  register_in?: string;
  check_script?: string;
  admin_route?: string;
  tenant_routes?: string[];
  env_template?: string;
  scripts?: string[];
  harness_pattern?: string;
}

export type AnyPattern = HarnessPattern | TenantPattern | OpslyPattern;

export interface PatternCatalogIntegration {
  module?: string;
  path?: string;
  npm?: Record<string, string>;
  mcp?: string[];
  sigmaHarness?: Record<string, string>;
  tenantProfile?: Record<string, string>;
  consumers?: string[];
  ci?: string[];
}

export interface PatternTenantBinding {
  stack_type?: string;
  pattern_ids: string[];
}

export interface PatternCatalogIndex {
  version: string;
  description: string;
  layout?: Record<string, string>;
  integration?: PatternCatalogIntegration;
  tenantBindings?: Record<string, PatternTenantBinding>;
  harness: string[];
  tenant: string[];
  opsly: string[];
  upstream?: Record<string, unknown>;
}

export interface AppliedHarnessPattern {
  pattern: HarnessPattern;
  reviewers: PatternReviewer[];
  harnessOverrides: HarnessPatternOverrides;
  sigmaSearchText: string;
  topic: string;
}

export interface ResolvedTenantCapabilities {
  pattern_ids: string[];
  capabilities: string[];
  modules: string[];
  harness_patterns: string[];
  scripts: string[];
}
