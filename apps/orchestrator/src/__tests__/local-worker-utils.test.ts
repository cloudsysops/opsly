import { describe, expect, it } from 'vitest';
import {
  agentForLocalJobType,
  jobTypeForLocalAgent,
  normalizeLocalAgentKind,
  parsePromptFrontmatter,
} from '../lib/local-worker-utils.js';

describe('local-worker-utils', () => {
  it('parses simple prompt frontmatter', () => {
    const parsed = parsePromptFrontmatter(
      [
        '---',
        'agent: claude',
        'agent_role: executor',
        'max_steps: 3',
        '---',
        '',
        'Build the thing.',
      ].join('\n')
    );

    expect(parsed.metadata).toEqual({
      agent: 'claude',
      agent_role: 'executor',
      max_steps: '3',
    });
    expect(parsed.content).toBe('Build the thing.');
  });

  it('maps external CLI aliases to canonical Opsly job types', () => {
    expect(jobTypeForLocalAgent('cursor')).toBe('local_cursor');
    expect(jobTypeForLocalAgent('claude')).toBe('local_claude');
    expect(jobTypeForLocalAgent('copilot')).toBe('local_copilot');
    expect(jobTypeForLocalAgent('opencode')).toBe('local_opencode');
    expect(jobTypeForLocalAgent('codex')).toBe('local_codex');
    expect(jobTypeForLocalAgent('openai')).toBe('local_openai');
    expect(jobTypeForLocalAgent('hermes')).toBe('local_hermes');
    expect(jobTypeForLocalAgent('decepticon')).toBe('local_decepticon');
  });

  it('job type is idempotent for Opsly ids', () => {
    expect(jobTypeForLocalAgent('local_cursor')).toBe('local_cursor');
    expect(jobTypeForLocalAgent('local_claude')).toBe('local_claude');
  });

  it('maps BullMQ job names back to canonical Opsly agent ids', () => {
    expect(agentForLocalJobType('local_cursor')).toBe('local_cursor');
    expect(agentForLocalJobType('local_codex')).toBe('local_codex');
    expect(agentForLocalJobType('local_hermes')).toBe('local_hermes');
  });

  it('defaults unknown agent values to local_cursor', () => {
    expect(normalizeLocalAgentKind('bogus')).toBe('local_cursor');
    expect(normalizeLocalAgentKind('opencode')).toBe('local_opencode');
  });
});
