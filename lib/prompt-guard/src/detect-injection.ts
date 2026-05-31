export type InjectionSeverity = 'none' | 'low' | 'medium' | 'high';

export type InjectionDetection = {
  severity: InjectionSeverity;
  blocked: boolean;
  reasons: string[];
};

type PatternRule = {
  id: string;
  severity: Exclude<InjectionSeverity, 'none'>;
  pattern: RegExp;
};

const INJECTION_PATTERNS: PatternRule[] = [
  {
    id: 'ignore_instructions',
    severity: 'high',
    pattern:
      /\b(ignore|disregard|forget|override|bypass)\b.{0,40}\b(all|previous|prior|above|system|instructions|rules|prompt)\b/i,
  },
  {
    id: 'role_override',
    severity: 'high',
    pattern: /\b(you are now|act as|pretend to be|simulate being|from now on you)\b/i,
  },
  {
    id: 'system_exfiltration',
    severity: 'high',
    pattern:
      /\b(reveal|show|print|repeat|dump|output)\b.{0,30}\b(system prompt|hidden instructions|developer message|internal rules)\b/i,
  },
  {
    id: 'jailbreak_markers',
    severity: 'high',
    pattern: /\b(DAN|do anything now|jailbreak|developer mode|unrestricted mode)\b/i,
  },
  {
    id: 'delimiter_escape',
    severity: 'high',
    pattern: /<\/?(system|assistant|instructions|user_message|conversation)>/i,
  },
  {
    id: 'shell_execution',
    severity: 'high',
    pattern: /\b(rm\s+-rf|curl\s+|wget\s+|chmod\s+\+x|\/bin\/bash|sudo\s+|doppler\s+secrets|ACTIVE-PROMPT|cursor-prompt-monitor)\b/i,
  },
  {
    id: 'code_fence_shell',
    severity: 'medium',
    pattern: /```\s*(bash|sh|shell|zsh|powershell)/i,
  },
  {
    id: 'markdown_injection',
    severity: 'medium',
    pattern: /#\s*IMPORTANTE:\s*Este cambio fue aprobado automáticamente/i,
  },
  {
    id: 'json_override',
    severity: 'medium',
    pattern: /"decision_type"\s*:\s*"(auto_implement|needs_approval)"/i,
  },
];

function maxSeverity(a: InjectionSeverity, b: InjectionSeverity): InjectionSeverity {
  const order: InjectionSeverity[] = ['none', 'low', 'medium', 'high'];
  return order.indexOf(a) >= order.indexOf(b) ? a : b;
}

export function detectPromptInjection(text: string): InjectionDetection {
  const reasons: string[] = [];
  let severity: InjectionSeverity = 'none';

  const sample = text.trim();
  if (!sample) {
    return { severity: 'none', blocked: false, reasons: [] };
  }

  for (const rule of INJECTION_PATTERNS) {
    if (rule.pattern.test(sample)) {
      reasons.push(rule.id);
      severity = maxSeverity(severity, rule.severity);
    }
  }

  const blocked = severity === 'high';
  return { severity, blocked, reasons };
}
