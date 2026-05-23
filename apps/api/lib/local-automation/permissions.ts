import type { LocalAutomationPermission, LocalAutomationPolicy } from './types';

export function checkLocalAutomationPermission(params: {
  policy: LocalAutomationPolicy;
  actor: string;
  permission: LocalAutomationPermission;
  target?: string;
}): { allowed: boolean; approvalRequired: boolean; reason: string } {
  const actorPolicy = params.policy.agents[params.actor] ?? params.policy.agents.admin;
  const allowed = actorPolicy?.permissions.includes(params.permission) === true;
  const approvalRequired = params.policy.approval_required.includes(params.permission);

  if (!allowed) {
    return {
      allowed: false,
      approvalRequired,
      reason: `permission_denied:${params.permission}`,
    };
  }

  return {
    allowed: true,
    approvalRequired,
    reason: approvalRequired ? 'approval_required' : 'allowed',
  };
}

export function isBrewInstallAllowed(
  policy: LocalAutomationPolicy,
  kind: 'formula' | 'cask',
  packageName: string
): boolean {
  return kind === 'formula'
    ? policy.install_allowlist.brew_formula.includes(packageName)
    : policy.install_allowlist.brew_cask.includes(packageName);
}
