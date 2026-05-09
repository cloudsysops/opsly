/**
 * Knowledge Capture Service
 *
 * Helper utilities for agents to easily capture insights to Obsidian vault.
 */

export interface CapturePayload {
  agent: string;
  context: string;
  insight: string;
  tags?: string[];
}

export class KnowledgeCaptureService {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  /**
   * Capture an insight from an agent.
   *
   * Usage:
   * ```
   * const knowledge = new KnowledgeCaptureService();
   * await knowledge.capture({
   *   agent: 'syra',
   *   context: 'Published to Twitter, LinkedIn',
   *   insight: 'Multi-platform publishing achieved 15.2x ROI',
   *   tags: ['syra', 'publishing', 'roi']
   * });
   * ```
   */
  async capture(payload: CapturePayload): Promise<{ success: boolean; file: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/knowledge/capture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = (await response.json()) as { error?: string };
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      return (await response.json()) as { success: boolean; file: string };
    } catch (error) {
      console.error(`Knowledge capture failed (${payload.agent}):`, error);
      // Graceful fallback: don't block on knowledge capture failure
      return { success: false, file: '' };
    }
  }

  /**
   * Get today's captured insights.
   */
  async getTodayInsights(): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/api/knowledge/capture`, {
        method: 'GET',
      });

      if (!response.ok) {
        return '';
      }

      const data = (await response.json()) as { content?: string };
      return data.content || '';
    } catch {
      return '';
    }
  }

  /**
   * Capture an agent task completion.
   *
   * Convenience method for common scenarios.
   */
  async captureCompletion(
    agent: string,
    task: string,
    result: string,
    metrics?: Record<string, unknown>
  ): Promise<{ success: boolean; file: string }> {
    const insight = metrics ? `${result}\n\nMetrics: ${JSON.stringify(metrics, null, 2)}` : result;

    return this.capture({
      agent,
      context: `Completed: ${task}`,
      insight,
      tags: [agent.toLowerCase(), 'completed'],
    });
  }

  /**
   * Capture an agent error or issue for investigation.
   */
  async captureIssue(
    agent: string,
    issue: string,
    details: string
  ): Promise<{ success: boolean; file: string }> {
    return this.capture({
      agent,
      context: `Issue: ${issue}`,
      insight: details,
      tags: [agent.toLowerCase(), 'issue', 'urgent'],
    });
  }

  /**
   * Capture metrics and performance data.
   */
  async captureMetrics(
    agent: string,
    context: string,
    metrics: Record<string, unknown>
  ): Promise<{ success: boolean; file: string }> {
    return this.capture({
      agent,
      context,
      insight: `Metrics:\n\n${Object.entries(metrics)
        .map(([key, value]) => `- **${key}:** ${JSON.stringify(value)}`)
        .join('\n')}`,
      tags: [agent.toLowerCase(), 'metrics'],
    });
  }
}

// Singleton instance for easy import
export const knowledgeService = new KnowledgeCaptureService();
