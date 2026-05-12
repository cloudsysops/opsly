export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidateResult {
  valid: boolean;
  errors: ValidationError[];
}

export function validateInput(input: unknown, schema: Record<string, any>): ValidateResult {
  const errors: ValidationError[] = [];

  if (typeof input !== 'object' || input === null) {
    errors.push({ field: 'root', message: 'Input must be an object', severity: 'error' });
    return { valid: false, errors };
  }

  return { valid: errors.length === 0, errors };
}

export function validateOutput(output: unknown): ValidateResult {
  const errors: ValidationError[] = [];

  if (!output) {
    errors.push({ field: 'output', message: 'Output cannot be empty', severity: 'error' });
  }

  return { valid: errors.length === 0, errors };
}

export function checkForPII(text: string): ValidationError[] {
  const errors: ValidationError[] = [];
  const piiPatterns = {
    email: /[\w\.-]+@[\w\.-]+\.\w+/g,
    phone: /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  };

  for (const [type, pattern] of Object.entries(piiPatterns)) {
    if (pattern.test(text)) {
      errors.push({
        field: 'pii',
        message: `Potential ${type} detected`,
        severity: 'warning',
      });
    }
  }

  return errors;
}

export function checkForHallucinations(generated: string, context: string): ValidationError[] {
  // Simple heuristic: check if generated contains facts not in context
  const errors: ValidationError[] = [];

  // In production, use more sophisticated detection
  if (generated.length > context.length * 2) {
    errors.push({
      field: 'hallucination',
      message: 'Output significantly longer than input context',
      severity: 'warning',
    });
  }

  return errors;
}
