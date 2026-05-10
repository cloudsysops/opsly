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

  it('maps local agents to job types', () => {
    expect(jobTypeForLocalAgent('cursor')).toBe('local_cursor');
    expect(jobTypeForLocalAgent('claude')).toBe('local_claude');
    expect(jobTypeForLocalAgent('copilot')).toBe('local_copilot');
    expect(jobTypeForLocalAgent('opencode')).toBe('local_opencode');
    expect(jobTypeForLocalAgent('codex')).toBe('local_codex');
    expect(jobTypeForLocalAgent('openai')).toBe('local_openai');
    expect(jobTypeForLocalAgent('hermes')).toBe('local_hermes');
    expect(jobTypeForLocalAgent('decepticon')).toBe('local_decepticon');
  });

  it('maps local job types back to agent kinds', () => {
    expect(agentForLocalJobType('local_cursor')).toBe('cursor');
    expect(agentForLocalJobType('local_codex')).toBe('codex');
    expect(agentForLocalJobType('local_hermes')).toBe('hermes');
  });

  it('defaults unknown agent values to cursor', () => {
    expect(normalizeLocalAgentKind('bogus')).toBe('cursor');
    expect(normalizeLocalAgentKind('opencode')).toBe('opencode');
  });
});
