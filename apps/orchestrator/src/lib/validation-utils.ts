import { promises as fsp } from 'fs';
import * as path from 'path';

/**
 * Parse metadata from response file YAML frontmatter
 */
export async function parseResponseMetadata(filePath: string): Promise<Record<string, unknown>> {
  try {
    const content = await fsp.readFile(filePath, 'utf-8');

    // Extract YAML frontmatter (---...---)
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) {
      return {};
    }

    const yaml = match[1];
    const metadata: Record<string, unknown> = {};

    // Simple YAML parser (handles basic key: value pairs)
    for (const line of yaml.split('\n')) {
      if (!line.trim()) continue;

      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) continue;

      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();

      // Remove quotes if present
      let parsedValue: unknown = value.replace(/^['"]|['"]$/g, '');

      // Try to parse as number
      if (!isNaN(Number(parsedValue)) && parsedValue !== '') {
        parsedValue = Number(parsedValue);
      }

      // Try to parse as boolean
      if (parsedValue === 'true') parsedValue = true;
      if (parsedValue === 'false') parsedValue = false;

      metadata[key] = parsedValue;
    }

    return metadata;
  } catch (err) {
    console.error('[ValidationUtils] Error parsing metadata:', err);
    return {};
  }
}

/**
 * Extract code blocks from response content
 */
export interface CodeBlock {
  language: string;
  content: string;
  startLine: number;
}

export function extractCodeBlocks(content: string): CodeBlock[] {
  const blocks: CodeBlock[] = [];
  const regex = /```(\w*)\n([\s\S]*?)```/g;

  let match;
  let lineCount = 0;

  // Count lines to get line numbers
  for (let i = 0; i < content.length; i++) {
    if (content[i] === '\n') lineCount++;

    match = regex.exec(content);
    if (!match) break;

    blocks.push({
      language: match[1] || 'text',
      content: match[2],
      startLine: lineCount,
    });
  }

  return blocks;
}

/**
 * Write validation guard file to prevent double-commits
 */
export async function writeValidationGuard(
  jobId: string,
  decision: string,
  validationDir: string
): Promise<void> {
  try {
    const guardPath = path.join(validationDir, `${jobId}.guard`);

    const guard = {
      jobId,
      decision,
      timestamp: new Date().toISOString(),
    };

    await fsp.writeFile(guardPath, JSON.stringify(guard, null, 2), 'utf-8');
    console.log(`[ValidationUtils] Guard file written: ${guardPath}`);
  } catch (err) {
    console.error('[ValidationUtils] Error writing guard file:', err);
  }
}

/**
 * Check if validation guard exists for a job
 */
export async function hasValidationGuard(jobId: string, validationDir: string): Promise<boolean> {
  try {
    const guardPath = path.join(validationDir, `${jobId}.guard`);
    await fsp.access(guardPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate commit message with iteration metadata
 */
export function generateCommitMessage(
  jobId: string,
  agentRole: string,
  iterations: number
): string {
  return `feat(job-${jobId}): iteration ${iterations} complete - ${agentRole}`;
}

/**
 * Extract job ID from response filename
 */
export function extractJobIdFromFilename(filename: string): string {
  // response-{job_id}.md → {job_id}
  const match = filename.match(/^response-(.+)\.md$/);
  return match ? match[1] : filename;
}

/**
 * Extract job ID from file path
 */
export function extractJobIdFromPath(filePath: string): string {
  const filename = path.basename(filePath);
  return extractJobIdFromFilename(filename);
}

/**
 * Format error message for display
 */
export function formatErrorMessage(
  type: string,
  message: string,
  context?: Record<string, unknown>
): string {
  let formatted = `[${type.toUpperCase()}] ${message}`;

  if (context) {
    const contextStr = Object.entries(context)
      .map(([k, v]) => `${k}=${v}`)
      .join(', ');
    formatted += ` (${contextStr})`;
  }

  return formatted;
}

/**
 * Get suggestion for error type
 */
export function getSuggestionForErrorType(errorType: string): string {
  const suggestions: Record<string, string> = {
    'type-check': 'Ensure all TypeScript types are correct and complete',
    test: 'Add or fix test cases to ensure all tests pass',
    build: 'Fix any build configuration or compilation issues',
    'missing-imports': 'Check that all required modules are imported',
    'syntax-error': 'Review code for syntax errors and fix them',
  };

  return suggestions[errorType] || 'Review and fix the reported errors';
}

/**
 * Parse validation report from file
 */
export async function parseValidationReport(filePath: string): Promise<Record<string, unknown>> {
  try {
    const content = await fsp.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    console.error('[ValidationUtils] Error parsing validation report:', err);
    return {};
  }
}

/**
 * Check if file exists and is readable
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fsp.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read file content safely
 */
export async function readFileContent(filePath: string): Promise<string | null> {
  try {
    return await fsp.readFile(filePath, 'utf-8');
  } catch (err) {
    console.error('[ValidationUtils] Error reading file:', err);
    return null;
  }
}

/**
 * Calculate validation time in human-readable format
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}
