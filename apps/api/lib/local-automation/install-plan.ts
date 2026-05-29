import { appendAutomationAuditEvent } from './audit-log';
import { inspectRegisteredTools } from './discovery';
import { loadLocalAutomationPolicy } from './registry';
import type { ToolStatus } from './types';

export type InstallPlan = {
  generated_at: string;
  actor: string;
  tool: ToolStatus;
  allowed: boolean;
  approval_required: true;
  commands: Array<{ command: string; args: string[] }>;
  message: string;
};

function buildInstallCommands(
  tool: ToolStatus,
  allowed: boolean
): Array<{ command: string; args: string[] }> {
  if (!allowed || !tool.install.package) {
    return [];
  }

  return [
    {
      command: 'brew',
      args: ['install', tool.app?.brew_cask ? '--cask' : '', tool.install.package].filter(Boolean),
    },
  ];
}

function getAuditMessage(toolId: string, allowed: boolean): string {
  if (allowed) {
    return `Install plan created for ${toolId}; human approval required.`;
  }
  return `Install not allowed by policy for ${toolId}.`;
}

function getResultMessage(approvalRequired: boolean, allowed: boolean): string {
  if (approvalRequired && allowed) {
    return 'Approval required before execution. This endpoint does not install.';
  }
  return 'Install is denied by policy.';
}

export async function createInstallPlan(
  toolId: string,
  actor = 'admin'
): Promise<InstallPlan | null> {
  const [status, policy] = await Promise.all([
    inspectRegisteredTools(),
    loadLocalAutomationPolicy(),
  ]);
  const tool = status.tools.find((item) => item.id === toolId);
  if (!tool) {
    return null;
  }
  const allowed = tool.install.provider === 'brew' && tool.install.allowed;
  const commands = buildInstallCommands(tool, allowed);

  const event = await appendAutomationAuditEvent({
    actor,
    action: 'install_plan',
    permission: 'binary.install',
    target: toolId,
    allowed,
    approved: false,
    status: allowed ? 'planned' : 'denied',
    message: getAuditMessage(toolId, allowed),
  });

  return {
    generated_at: event.ts,
    actor,
    tool,
    allowed,
    approval_required: true,
    commands,
    message: getResultMessage(policy.approval_required.includes('binary.install'), allowed),
  };
}
