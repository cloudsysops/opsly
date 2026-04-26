export type LiliAutomationPolicyDecision = {
  useN8nAutomation: boolean;
  reason: string;
  recommendedMode: 'plan_execute' | 'react';
  recommendedSteps: string[];
};

const AUTOMATION_KEYWORDS = [
  'automatizar',
  'automate',
  'proceso',
  'workflow',
  'n8n',
  'crear script',
  'pipeline',
  'deploy',
];

function normalizeTaskText(input: string): string {
  return input.toLowerCase().trim();
}

export function evaluateAutomationPolicy(taskText: string): LiliAutomationPolicyDecision {
  const normalized = normalizeTaskText(taskText);
  const matched = AUTOMATION_KEYWORDS.some((keyword) => normalized.includes(keyword));

  if (!matched) {
    return {
      useN8nAutomation: false,
      reason: 'No automation keywords detected by opsly_lili policy engine.',
      recommendedMode: 'react',
      recommendedSteps: [],
    };
  }

  return {
    useN8nAutomation: true,
    reason: 'Automation workflow intent detected. Route through n8n-first execution.',
    recommendedMode: 'plan_execute',
    recommendedSteps: [
      'Escribir el workflow JSON en disco usando fs_write_file o n8n_create_workflow.',
      'Importar el workflow con execute_terminal ejecutando scripts/n8n-import.sh.',
      'Validar confirmacion de importacion y monitorear estado de ejecucion.',
    ],
  };
}
