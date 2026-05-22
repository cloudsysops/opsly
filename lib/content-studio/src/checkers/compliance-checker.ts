import type { ContentDraft } from '../types.js';

export interface ComplianceViolation {
  type: 'secret' | 'ip_address' | 'pii_email' | 'pii_phone' | 'pii_ssn' | 'api_key' | 'token';
  severity: 'high' | 'medium' | 'low';
  message: string;
  location: string;
}

export interface ComplianceResult {
  isCompliant: boolean;
  violations: ComplianceViolation[];
}

const patterns = {
  aws_key: /AKIA[0-9A-Z]{16}/g,
  aws_secret: /aws_secret_access_key\s*=\s*[^\s]+/gi,
  github_token: /gh[pruoats]_[A-Za-z0-9_]{36,255}/g,
  api_key_generic: /api[_-]?key\s*[:=]\s*[^\s]+/gi,
  bearer_token: /bearer\s+[a-zA-Z0-9\-._~+/]+=*/gi,
  ipv4: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone_us: /\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g,
  ssn: /\b(?!000|666)\d{3}-(?!00)\d{2}-(?!0000)\d{4}\b/g,
  mongodb_uri: /mongodb\+srv?:\/\/[^\s]+/gi,
  db_password: /password\s*[:=]\s*[^\s]+/gi,
};

function checkForSecrets(text: string): ComplianceViolation[] {
  const violations: ComplianceViolation[] = [];

  if (patterns.aws_key.test(text)) {
    violations.push({
      type: 'secret',
      severity: 'high',
      message: 'AWS access key detected',
      location: 'content',
    });
  }

  if (patterns.aws_secret.test(text)) {
    violations.push({
      type: 'secret',
      severity: 'high',
      message: 'AWS secret key detected',
      location: 'content',
    });
  }

  if (patterns.github_token.test(text)) {
    violations.push({
      type: 'token',
      severity: 'high',
      message: 'GitHub token detected',
      location: 'content',
    });
  }

  if (patterns.api_key_generic.test(text)) {
    violations.push({
      type: 'api_key',
      severity: 'high',
      message: 'API key detected',
      location: 'content',
    });
  }

  if (patterns.bearer_token.test(text)) {
    violations.push({
      type: 'token',
      severity: 'high',
      message: 'Bearer token detected',
      location: 'content',
    });
  }

  if (patterns.mongodb_uri.test(text)) {
    violations.push({
      type: 'secret',
      severity: 'high',
      message: 'Database connection string detected',
      location: 'content',
    });
  }

  if (patterns.db_password.test(text)) {
    violations.push({
      type: 'secret',
      severity: 'high',
      message: 'Database password detected',
      location: 'content',
    });
  }

  return violations;
}

function checkForIPAddresses(text: string): ComplianceViolation[] {
  const violations: ComplianceViolation[] = [];

  if (patterns.ipv4.test(text)) {
    violations.push({
      type: 'ip_address',
      severity: 'medium',
      message: 'IP address detected in content',
      location: 'content',
    });
  }

  return violations;
}

function checkForPII(text: string): ComplianceViolation[] {
  const violations: ComplianceViolation[] = [];

  if (patterns.email.test(text)) {
    violations.push({
      type: 'pii_email',
      severity: 'medium',
      message: 'Email address detected',
      location: 'content',
    });
  }

  if (patterns.phone_us.test(text)) {
    violations.push({
      type: 'pii_phone',
      severity: 'medium',
      message: 'Phone number detected',
      location: 'content',
    });
  }

  if (patterns.ssn.test(text)) {
    violations.push({
      type: 'pii_ssn',
      severity: 'high',
      message: 'Social Security Number detected',
      location: 'content',
    });
  }

  return violations;
}

export function checkDraftCompliance(draft: Partial<ContentDraft>): ComplianceResult {
  const textToCheck = [
    draft.title || '',
    draft.story_hook || '',
    draft.call_to_action || '',
    draft.image_prompt || '',
  ].join(' ');

  const violations: ComplianceViolation[] = [
    ...checkForSecrets(textToCheck),
    ...checkForIPAddresses(textToCheck),
    ...checkForPII(textToCheck),
  ];

  return {
    isCompliant: violations.length === 0,
    violations,
  };
}

export function checkCaptionsCompliance(captions: string[]): ComplianceResult {
  const textToCheck = captions.join(' ');

  const violations: ComplianceViolation[] = [
    ...checkForSecrets(textToCheck),
    ...checkForIPAddresses(textToCheck),
    ...checkForPII(textToCheck),
  ];

  return {
    isCompliant: violations.length === 0,
    violations,
  };
}

export function performFullCompliance(draft: Partial<ContentDraft>): ComplianceResult {
  const draftResult = checkDraftCompliance(draft);

  const captionTexts = draft.captions?.map((c) => c.text).filter(Boolean) || [];
  const captionsResult = checkCaptionsCompliance(captionTexts);

  const allViolations = [...draftResult.violations, ...captionsResult.violations];

  return {
    isCompliant: allViolations.length === 0,
    violations: allViolations,
  };
}
