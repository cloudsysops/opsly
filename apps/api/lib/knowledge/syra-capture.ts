/**
 * Syra Knowledge Auto-Capture Hook
 *
 * Automatically captures Syra's publishing results to Obsidian vault
 * after each successful post.
 */

import { knowledgeService } from './capture-service';

export interface PublishMetrics extends Record<string, unknown> {
  platforms_published: string[];
  total_posts: number;
  success_rate: number;
  estimated_reach?: number;
  cost_usd?: number;
}

/**
 * Called after Syra publishes to platforms.
 * Captures the publishing event + metrics to knowledge vault.
 */
export async function capturePublishEvent(
  event_type: string,
  platforms: string[],
  metrics: PublishMetrics
): Promise<void> {
  try {
    const insight = `
Published to: ${platforms.join(', ')}

**Metrics:**
- Posts published: ${metrics.total_posts}
- Success rate: ${(metrics.success_rate * 100).toFixed(1)}%
${metrics.estimated_reach ? `- Estimated reach: ${metrics.estimated_reach.toLocaleString()}` : ''}
${metrics.cost_usd ? `- Cost: $${metrics.cost_usd.toFixed(4)}` : ''}

**Event:** \`${event_type}\`
**Platforms:** ${platforms.join(', ')}
`;

    await knowledgeService.captureCompletion(
      'syra',
      `Published to ${platforms.join(', ')}`,
      insight,
      metrics
    );

    console.warn('✅ Publishing event captured to knowledge vault');
  } catch (error) {
    // Graceful fallback: don't block on knowledge capture
    console.warn('Knowledge capture warning (non-critical):', error);
  }
}

/**
 * Called when Syra encounters an issue during publishing.
 */
export async function capturePublishError(
  platform: string,
  error_message: string,
  details: string
): Promise<void> {
  try {
    const fullDetails = `
**Platform:** ${platform}
**Error:** ${error_message}

${details}
`;

    await knowledgeService.captureIssue('syra', `Publishing failed on ${platform}`, fullDetails);

    console.warn('⚠️ Publishing error captured for investigation');
  } catch (error) {
    console.warn('Knowledge capture warning (non-critical):', error);
  }
}

/**
 * Capture Syra's engagement metrics periodically.
 */
export async function captureEngagementMetrics(metrics: Record<string, unknown>): Promise<void> {
  try {
    await knowledgeService.captureMetrics('syra', 'Engagement metrics collected', metrics);

    console.warn('📊 Engagement metrics captured');
  } catch (error) {
    console.warn('Knowledge capture warning (non-critical):', error);
  }
}

/**
 * Capture when Syra reaches a milestone.
 */
export async function captureMilestone(milestone: string, details: string): Promise<void> {
  try {
    await knowledgeService.capture({
      agent: 'syra',
      context: `Milestone: ${milestone}`,
      insight: details,
      tags: ['syra', 'milestone'],
    });

    console.warn('🎉 Milestone captured');
  } catch (error) {
    console.warn('Knowledge capture warning (non-critical):', error);
  }
}
