import {
  ClassifiedError,
  ClassificationRule,
  ErrorCategory,
  ErrorContext,
  ErrorClassifierConfig,
  RepairStrategy,
} from './types';
import { DEFAULT_CLASSIFICATION_RULES } from './rules/default-rules';

export class ErrorClassifier {
  private rules: ClassificationRule[];
  private config: Required<ErrorClassifierConfig>;

  constructor(config?: Partial<ErrorClassifierConfig>) {
    this.config = {
      enableRepairQueue: config?.enableRepairQueue ?? true,
      maxRepairAttempts: config?.maxRepairAttempts ?? 3,
      repairQueueName: config?.repairQueueName ?? 'openclaw-repair',
      defaultStrategy: config?.defaultStrategy ?? 'auto_retry',
      customRules: config?.customRules ?? [],
    };

    this.rules = [
      ...DEFAULT_CLASSIFICATION_RULES,
      ...this.config.customRules,
    ];
  }

  /**
   * Classify an error based on its message and context
   */
  classify(
    error: Error | string,
    context: Partial<ErrorContext> = {}
  ): ClassifiedError {
    const message = typeof error === 'string' ? error : error.message;
    const errorContext: ErrorContext = {
      tenant_slug: context.tenant_slug ?? 'unknown',
      timestamp: context.timestamp ?? Date.now(),
      ...context,
    };

    // Try to match against classification rules
    for (const rule of this.rules) {
      if (this.matchesRule(message, rule)) {
        return this.createClassificationResult(
          rule,
          message,
          errorContext,
          'matched'
        );
      }
    }

    // Fallback to unknown category
    return {
      category: 'unknown',
      strategy: this.config.defaultStrategy,
      message,
      isRecoverable: true,
      suggestedAction: 'Review error logs and contact support',
      priority: 'normal',
      metadata: {
        context: errorContext,
        rulesChecked: this.rules.length,
      },
      confidence: 0.1,
    };
  }

  /**
   * Get repair strategy for a classified error
   */
  getRepairStrategy(classified: ClassifiedError): {
    shouldRepair: boolean;
    strategy: RepairStrategy;
    maxAttempts: number;
    backoffMs: number;
  } {
    const rule = this.findRule(classified.category);

    return {
      shouldRepair:
        this.config.enableRepairQueue &&
        classified.isRecoverable &&
        classified.strategy !== 'fail_fast',
      strategy: classified.strategy,
      maxAttempts: rule?.maxRetries ?? 1,
      backoffMs: rule?.backoffMs ?? 1000,
    };
  }

  /**
   * Add a custom classification rule
   */
  addRule(rule: ClassificationRule): void {
    this.rules.push(rule);
  }

  /**
   * Remove a rule by ID
   */
  removeRule(ruleId: string): boolean {
    const index = this.rules.findIndex((r) => r.id === ruleId);
    if (index >= 0) {
      this.rules.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get statistics about classification rules
   */
  getStats(): {
    totalRules: number;
    byCategory: Record<ErrorCategory, number>;
    byStrategy: Record<RepairStrategy, number>;
  } {
    const byCategory: Record<ErrorCategory, number> = {
      credits_exhausted: 0,
      rate_limit: 0,
      timeout: 0,
      config_error: 0,
      provider_error: 0,
      irrecuperable: 0,
      unknown: 0,
    };

    const byStrategy: Record<RepairStrategy, number> = {
      auto_retry: 0,
      operator_review: 0,
      fail_fast: 0,
      exponential_backoff: 0,
    };

    for (const rule of this.rules) {
      byCategory[rule.category]++;
      byStrategy[rule.strategy]++;
    }

    return {
      totalRules: this.rules.length,
      byCategory,
      byStrategy,
    };
  }

  // Private helpers

  private matchesRule(message: string, rule: ClassificationRule): boolean {
    if (typeof rule.pattern === 'string') {
      return message.toLowerCase().includes(rule.pattern.toLowerCase());
    }
    return rule.pattern.test(message);
  }

  private createClassificationResult(
    rule: ClassificationRule,
    message: string,
    context: ErrorContext,
    matchType: 'matched' | 'fallback'
  ): ClassifiedError {
    return {
      category: rule.category,
      strategy: rule.strategy,
      message,
      isRecoverable: rule.isRecoverable,
      suggestedAction: rule.suggestedAction,
      priority: rule.priority,
      metadata: {
        ruleId: rule.id,
        ruleName: rule.name,
        matchType,
        context,
        tags: rule.tags,
      },
      confidence: 0.95,
    };
  }

  private findRule(category: ErrorCategory): ClassificationRule | undefined {
    return this.rules.find((r) => r.category === category);
  }
}

/**
 * Singleton instance
 */
let classifierInstance: ErrorClassifier | null = null;

/**
 * Get or create the global error classifier instance
 */
export function getErrorClassifier(
  config?: Partial<ErrorClassifierConfig>
): ErrorClassifier {
  if (!classifierInstance) {
    classifierInstance = new ErrorClassifier(config);
  }
  return classifierInstance;
}

/**
 * Convenience function to classify an error
 */
export function classifyError(
  error: Error | string,
  context?: Partial<ErrorContext>
): ClassifiedError {
  return getErrorClassifier().classify(error, context);
}
