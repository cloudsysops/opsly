import { describe, it, expect } from 'vitest';
import {
  checkDraftCompliance,
  checkCaptionsCompliance,
  performFullCompliance,
} from '../compliance-checker.js';
import type { ContentDraft } from '../../types.js';

describe('ComplianceChecker', () => {
  const safeDraft: Partial<ContentDraft> = {
    title: 'New Feature Release',
    story_hook: 'We shipped an amazing new feature',
    call_to_action: 'Check out the live demo',
    image_prompt: 'A beautiful sunset',
  };

  describe('checkDraftCompliance', () => {
    it('should pass compliance for safe content', () => {
      const result = checkDraftCompliance(safeDraft);

      expect(result.isCompliant).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should detect AWS access keys', () => {
      const draftWithSecret: Partial<ContentDraft> = {
        ...safeDraft,
        story_hook: 'Check out AKIAIOSFODNN7EXAMPLE in production',
      };

      const result = checkDraftCompliance(draftWithSecret);

      expect(result.isCompliant).toBe(false);
      expect(result.violations.some((v) => v.type === 'secret')).toBe(true);
    });

    it('should detect AWS secret keys', () => {
      const draftWithSecret: Partial<ContentDraft> = {
        ...safeDraft,
        story_hook: 'aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      };

      const result = checkDraftCompliance(draftWithSecret);

      expect(result.isCompliant).toBe(false);
      expect(result.violations.some((v) => v.severity === 'high')).toBe(true);
    });

    it('should detect GitHub tokens', () => {
      const draftWithToken: Partial<ContentDraft> = {
        ...safeDraft,
        story_hook: 'Token is ghp_1234567890abcdefghijklmnopqrstuvwxyz1234',
      };

      const result = checkDraftCompliance(draftWithToken);

      expect(result.isCompliant).toBe(false);
      expect(result.violations.some((v) => v.type === 'token')).toBe(true);
    });

    it('should detect API keys', () => {
      const draftWithApiKey: Partial<ContentDraft> = {
        ...safeDraft,
        story_hook: 'Use api_key: sk_test_abc123def456ghi789jkl',
      };

      const result = checkDraftCompliance(draftWithApiKey);

      expect(result.isCompliant).toBe(false);
      expect(result.violations.some((v) => v.type === 'api_key')).toBe(true);
    });

    it('should detect bearer tokens', () => {
      const draftWithBearer: Partial<ContentDraft> = {
        ...safeDraft,
        story_hook: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
      };

      const result = checkDraftCompliance(draftWithBearer);

      expect(result.isCompliant).toBe(false);
      expect(result.violations.some((v) => v.type === 'token')).toBe(true);
    });

    it('should detect IP addresses', () => {
      const draftWithIP: Partial<ContentDraft> = {
        ...safeDraft,
        story_hook: 'Server running at 192.168.1.100',
      };

      const result = checkDraftCompliance(draftWithIP);

      expect(result.isCompliant).toBe(false);
      expect(result.violations.some((v) => v.type === 'ip_address')).toBe(true);
    });

    it('should detect email addresses', () => {
      const draftWithEmail: Partial<ContentDraft> = {
        ...safeDraft,
        story_hook: 'Contact us at john.doe@example.com for details',
      };

      const result = checkDraftCompliance(draftWithEmail);

      expect(result.isCompliant).toBe(false);
      expect(result.violations.some((v) => v.type === 'pii_email')).toBe(true);
    });

    it('should detect US phone numbers', () => {
      const draftWithPhone: Partial<ContentDraft> = {
        ...safeDraft,
        story_hook: 'Call us at (555) 123-4567 for support',
      };

      const result = checkDraftCompliance(draftWithPhone);

      expect(result.isCompliant).toBe(false);
      expect(result.violations.some((v) => v.type === 'pii_phone')).toBe(true);
    });

    it('should detect SSN patterns', () => {
      const draftWithSSN: Partial<ContentDraft> = {
        ...safeDraft,
        story_hook: 'SSN 123-45-6789 is not valid',
      };

      const result = checkDraftCompliance(draftWithSSN);

      expect(result.isCompliant).toBe(false);
      expect(result.violations.some((v) => v.type === 'pii_ssn')).toBe(true);
    });

    it('should detect database connection strings', () => {
      const draftWithDB: Partial<ContentDraft> = {
        ...safeDraft,
        story_hook:
          'mongodb+srv://user:password@cluster.mongodb.net/database',
      };

      const result = checkDraftCompliance(draftWithDB);

      expect(result.isCompliant).toBe(false);
      expect(result.violations.some((v) => v.type === 'secret')).toBe(true);
    });

    it('should detect database passwords', () => {
      const draftWithPassword: Partial<ContentDraft> = {
        ...safeDraft,
        story_hook: 'password = SuperSecretPassword123!',
      };

      const result = checkDraftCompliance(draftWithPassword);

      expect(result.isCompliant).toBe(false);
      expect(result.violations.some((v) => v.type === 'secret')).toBe(true);
    });

    it('should handle multiple violations', () => {
      const draftWithMultipleViolations: Partial<ContentDraft> = {
        ...safeDraft,
        story_hook:
          'Contact john@example.com or call 555-123-4567. Token: ghp_1234567890abcdefghijklmnopqrstuvwxyz1234',
      };

      const result = checkDraftCompliance(draftWithMultipleViolations);

      expect(result.isCompliant).toBe(false);
      expect(result.violations.length).toBeGreaterThan(1);
    });
  });

  describe('checkCaptionsCompliance', () => {
    it('should pass compliance for safe captions', () => {
      const result = checkCaptionsCompliance([
        'Amazing new feature released',
        'Check out what we built',
      ]);

      expect(result.isCompliant).toBe(true);
    });

    it('should detect secrets in captions', () => {
      const result = checkCaptionsCompliance([
        'Check AKIAIOSFODNN7EXAMPLE in production',
      ]);

      expect(result.isCompliant).toBe(false);
      expect(result.violations.some((v) => v.type === 'secret')).toBe(true);
    });

    it('should detect PII in multiple captions', () => {
      const result = checkCaptionsCompliance([
        'Great product',
        'Email support@example.com for help',
      ]);

      expect(result.isCompliant).toBe(false);
      expect(result.violations.some((v) => v.type === 'pii_email')).toBe(true);
    });
  });

  describe('performFullCompliance', () => {
    it('should check both draft and captions', () => {
      const draft: Partial<ContentDraft> = {
        ...safeDraft,
        captions: [
          {
            platform: 'instagram',
            text: 'Safe caption text',
            hashtags: [],
            characterCount: 20,
          },
        ],
      };

      const result = performFullCompliance(draft);

      expect(result.isCompliant).toBe(true);
    });

    it('should catch violations in captions when draft is safe', () => {
      const draft: Partial<ContentDraft> = {
        ...safeDraft,
        captions: [
          {
            platform: 'instagram',
            text: 'Contact john@example.com for details',
            hashtags: [],
            characterCount: 36,
          },
        ],
      };

      const result = performFullCompliance(draft);

      expect(result.isCompliant).toBe(false);
      expect(result.violations.some((v) => v.type === 'pii_email')).toBe(true);
    });

    it('should catch violations in both draft and captions', () => {
      const draft: Partial<ContentDraft> = {
        ...safeDraft,
        story_hook: 'Token is ghp_1234567890abcdefghijklmnopqrstuvwxyz1234',
        captions: [
          {
            platform: 'instagram',
            text: 'Call us at (555) 123-4567',
            hashtags: [],
            characterCount: 26,
          },
        ],
      };

      const result = performFullCompliance(draft);

      expect(result.isCompliant).toBe(false);
      expect(result.violations.length).toBeGreaterThan(1);
    });

    it('should handle drafts without captions', () => {
      const draft: Partial<ContentDraft> = {
        ...safeDraft,
        captions: undefined,
      };

      const result = performFullCompliance(draft);

      expect(result.isCompliant).toBe(true);
    });

    it('should handle empty captions array', () => {
      const draft: Partial<ContentDraft> = {
        ...safeDraft,
        captions: [],
      };

      const result = performFullCompliance(draft);

      expect(result.isCompliant).toBe(true);
    });
  });
});
