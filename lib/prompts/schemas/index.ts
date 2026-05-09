import type { PromptMetadata } from '../registry.js';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validatePromptSchema(metadata: PromptMetadata): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!metadata.name || metadata.name.length === 0) {
    errors.push('Prompt name is required');
  }

  if (!metadata.version || !/^\d+\.\d+\.\d+$/.test(metadata.version)) {
    errors.push('Prompt version must be semantic (e.g., 1.0.0)');
  }

  if (!metadata.author || metadata.author === 'unknown') {
    warnings.push('Prompt author is recommended');
  }

  if (!metadata.tags || metadata.tags.length === 0) {
    warnings.push('Prompt tags are recommended for discoverability');
  }

  if (metadata.description && metadata.description.length < 10) {
    warnings.push('Prompt description should be at least 10 characters');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function validatePromptTemplate(content: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!content || content.trim().length === 0) {
    errors.push('Prompt content cannot be empty');
  }

  if (content.length > 100000) {
    warnings.push('Prompt is very large (>100KB), consider splitting');
  }

  // Check for common placeholder patterns
  const placeholders = content.match(/\{\{[\w-]+\}\}/g) || [];
  if (placeholders.length === 0) {
    warnings.push('No template variables found (expected {{variable}} patterns)');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function validatePrompt(
  content: string,
  metadata: PromptMetadata
): ValidationResult {
  const schemaResult = validatePromptSchema(metadata);
  const templateResult = validatePromptTemplate(content);

  return {
    valid: schemaResult.valid && templateResult.valid,
    errors: [...schemaResult.errors, ...templateResult.errors],
    warnings: [...schemaResult.warnings, ...templateResult.warnings],
  };
}
