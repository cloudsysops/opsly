import { describe, it, expect } from 'vitest';
import {
  generateCaption,
  generateCaptions,
  enrichContentDraftWithCaptions,
} from '../caption-generator.js';
import type { Platform, Caption } from '../caption-generator.js';
import type { ContentDraft } from '../../types.js';

describe('CaptionGenerator', () => {
  const storyHook = 'This is an exciting new feature release that ships today';
  const callToAction = 'Check out the live demo';

  const mockDraft: Partial<ContentDraft> = {
    tenant_slug: 'test-tenant',
    story_hook: storyHook,
    call_to_action: callToAction,
  };

  describe('generateCaption', () => {
    it('should generate caption for instagram with character limit', () => {
      const caption = generateCaption('instagram', storyHook, callToAction);

      expect(caption.platform).toBe('instagram');
      expect(caption.text.length).toBeLessThanOrEqual(2200);
      expect(caption.hashtags).toEqual([
        '#shipping',
        '#devops',
        '#automation',
        '#engineering',
      ]);
      expect(caption.characterCount).toBe(caption.text.length);
    });

    it('should generate caption for x (280 char limit)', () => {
      const caption = generateCaption('x', storyHook, callToAction);

      expect(caption.platform).toBe('x');
      expect(caption.text.length).toBeLessThanOrEqual(280);
      expect(caption.hashtags).toEqual(['#shipping', '#devops', '#eng']);
    });

    it('should generate caption for all 12 platforms within limits', () => {
      const platforms: Platform[] = [
        'instagram',
        'facebook',
        'linkedin',
        'x',
        'tiktok',
        'youtube',
        'threads',
        'pinterest',
        'reddit',
        'discord',
        'telegram',
        'whatsapp',
      ];

      const limits: Record<Platform, number> = {
        instagram: 2200,
        facebook: 63206,
        linkedin: 3000,
        x: 280,
        tiktok: 2200,
        youtube: 5000,
        threads: 500,
        pinterest: 500,
        reddit: 10000,
        discord: 2000,
        telegram: 4096,
        whatsapp: 1024,
      };

      platforms.forEach((platform) => {
        const caption = generateCaption(platform, storyHook, callToAction);
        expect(caption.text.length).toBeLessThanOrEqual(limits[platform]);
      });
    });

    it('should truncate to character limit with ellipsis', () => {
      const longHook =
        'A'.repeat(300) +
        ' ' +
        'B'.repeat(300) +
        ' ' +
        'C'.repeat(300) +
        ' ' +
        'D'.repeat(300);

      const caption = generateCaption('x', longHook, callToAction);

      expect(caption.text.length).toBeLessThanOrEqual(280);
      expect(caption.text.endsWith('...')).toBe(true);
    });

    it('should include hashtags for instagram', () => {
      const caption = generateCaption('instagram', storyHook, callToAction);

      expect(caption.text).toContain('#shipping');
      expect(caption.text).toContain('#devops');
    });

    it('should not include hashtags for reddit, discord, telegram', () => {
      const noHashtagPlatforms: Platform[] = [
        'reddit',
        'discord',
        'telegram',
        'whatsapp',
      ];

      noHashtagPlatforms.forEach((platform) => {
        const caption = generateCaption(platform, storyHook, callToAction);
        expect(caption.hashtags).toHaveLength(0);
      });
    });

    it('should include call to action in caption', () => {
      const caption = generateCaption('instagram', storyHook, callToAction);

      expect(caption.text).toContain(callToAction);
    });

    it('should return character count matching text length', () => {
      const caption = generateCaption('linkedin', storyHook, callToAction);

      expect(caption.characterCount).toBe(caption.text.length);
    });
  });

  describe('generateCaptions', () => {
    it('should generate captions for all platforms by default', () => {
      const captions = generateCaptions(storyHook, callToAction);

      expect(captions.length).toBeGreaterThanOrEqual(12);
      expect(captions.map((c) => c.platform)).toContain('instagram');
      expect(captions.map((c) => c.platform)).toContain('x');
      expect(captions.map((c) => c.platform)).toContain('linkedin');
    });

    it('should generate captions for specified platforms only', () => {
      const platforms: Platform[] = ['instagram', 'linkedin', 'x'];
      const captions = generateCaptions(storyHook, callToAction, platforms);

      expect(captions).toHaveLength(3);
      expect(captions[0].platform).toBe('instagram');
      expect(captions[1].platform).toBe('linkedin');
      expect(captions[2].platform).toBe('x');
    });
  });

  describe('enrichContentDraftWithCaptions', () => {
    it('should enrich draft with captions and copy_paste_kit', () => {
      const enriched = enrichContentDraftWithCaptions(mockDraft);

      expect(enriched.captions).toBeDefined();
      expect(enriched.captions).toHaveLength(12);
      expect(enriched.copy_paste_kit).toBeDefined();
    });

    it('should populate instagram_caption in copy_paste_kit', () => {
      const enriched = enrichContentDraftWithCaptions(mockDraft);

      expect(enriched.copy_paste_kit?.instagram_caption).toBeTruthy();
      expect(enriched.copy_paste_kit?.instagram_caption).toContain(storyHook);
    });

    it('should populate all copy_paste_kit fields', () => {
      const enriched = enrichContentDraftWithCaptions(mockDraft);

      expect(enriched.copy_paste_kit?.instagram_caption).toBeTruthy();
      expect(enriched.copy_paste_kit?.facebook_caption).toBeTruthy();
      expect(enriched.copy_paste_kit?.linkedin_caption).toBeTruthy();
      expect(enriched.copy_paste_kit?.x_caption).toBeTruthy();
      expect(enriched.copy_paste_kit?.tiktok_script).toBeTruthy();
      expect(enriched.copy_paste_kit?.youtube_shorts_script).toBeTruthy();
    });

    it('should return original draft if missing story_hook', () => {
      const incompleteDraft: Partial<ContentDraft> = {
        call_to_action: callToAction,
      };

      const enriched = enrichContentDraftWithCaptions(incompleteDraft);

      expect(enriched).toEqual(incompleteDraft);
    });

    it('should return original draft if missing call_to_action', () => {
      const incompleteDraft: Partial<ContentDraft> = {
        story_hook: storyHook,
      };

      const enriched = enrichContentDraftWithCaptions(incompleteDraft);

      expect(enriched).toEqual(incompleteDraft);
    });

    it('should enrich draft for specific platforms only', () => {
      const platforms: Platform[] = ['instagram', 'linkedin', 'x'];
      const enriched = enrichContentDraftWithCaptions(mockDraft, platforms);

      expect(enriched.captions).toHaveLength(3);
      const captionPlatforms = enriched.captions?.map((c) => c.platform);
      expect(captionPlatforms).toContain('instagram');
      expect(captionPlatforms).toContain('linkedin');
      expect(captionPlatforms).toContain('x');
    });

    it('should preserve existing draft fields', () => {
      const draftWithFields: Partial<ContentDraft> = {
        ...mockDraft,
        tenant_slug: 'test-tenant',
        title: 'Test Title',
      };

      const enriched = enrichContentDraftWithCaptions(draftWithFields);

      expect(enriched.tenant_slug).toBe('test-tenant');
      expect(enriched.title).toBe('Test Title');
    });

    it('should use hashtags from each caption in copy_paste_kit', () => {
      const enriched = enrichContentDraftWithCaptions(mockDraft);

      const instagramCaption = enriched.captions?.find(
        (c) => c.platform === 'instagram',
      );
      expect(instagramCaption?.hashtags.length).toBeGreaterThan(0);
      instagramCaption?.hashtags.forEach((tag) => {
        expect(enriched.copy_paste_kit?.instagram_caption).toContain(tag);
      });
    });
  });

  describe('Platform-specific behavior', () => {
    it('should respect character limits for extreme cases', () => {
      const tinyHook = 'Hi';
      const tinyCta = 'Yes';

      const caption = generateCaption('x', tinyHook, tinyCta);
      expect(caption.text.length).toBeLessThanOrEqual(280);
    });

    it('should handle facebook with very high limit', () => {
      const caption = generateCaption('facebook', storyHook, callToAction);

      expect(caption.text.length).toBeLessThanOrEqual(63206);
    });

    it('should handle threads with 500 char limit', () => {
      const caption = generateCaption('threads', storyHook, callToAction);

      expect(caption.text.length).toBeLessThanOrEqual(500);
    });

    it('should handle reddit, discord, telegram, whatsapp without hashtags', () => {
      const noHashtagPlatforms: Platform[] = [
        'reddit',
        'discord',
        'telegram',
        'whatsapp',
      ];

      noHashtagPlatforms.forEach((platform) => {
        const caption = generateCaption(platform, storyHook, callToAction);
        expect(caption.hashtags).toHaveLength(0);
      });
    });
  });
});
