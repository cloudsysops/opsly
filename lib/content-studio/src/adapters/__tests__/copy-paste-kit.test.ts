import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CopyPasteKit } from '../copy-paste-kit.js';
import type { ContentDraft } from '../../types.js';

describe('CopyPasteKit', () => {
  const mockDraft: Partial<ContentDraft> = {
    id: 'draft-001',
    title: 'New Feature Launch',
    story_hook: 'We just launched an amazing new feature',
    call_to_action: 'Check it out →',
    created_at: '2024-12-20T10:00:00Z',
    copy_paste_kit: {
      instagram_caption: 'Check out our new feature! #shipping #devops',
      facebook_caption: 'New feature is live',
      linkedin_caption: 'Excited to announce...',
      x_caption: 'Ship it! 🚀',
      tiktok_script: 'New feature TikTok script',
      youtube_shorts_script: 'YouTube Shorts script',
    },
    captions: [
      {
        platform: 'instagram',
        text: 'Check out our new feature! #shipping #devops',
        hashtags: ['#shipping', '#devops'],
        characterCount: 47,
      },
      {
        platform: 'x',
        text: 'Ship it! 🚀',
        hashtags: [],
        characterCount: 10,
      },
    ],
    image_prompt: 'A modern UI showing the new feature',
    state: 'approved',
  };

  describe('generateMarkdown', () => {
    it('should generate markdown with all fields', () => {
      const result = CopyPasteKit.generateMarkdown(mockDraft);

      expect(result.format).toBe('markdown');
      expect(result.content).toContain('# New Feature Launch');
      expect(result.content).toContain('## Story Hook');
      expect(result.content).toContain('We just launched an amazing new feature');
      expect(result.content).toContain('## Call to Action');
      expect(result.content).toContain('Check it out →');
      expect(result.content).toContain('## Platform Captions');
      expect(result.content).toContain('### Instagram');
      expect(result.content).toContain('### X (Twitter)');
    });

    it('should include metadata', () => {
      const result = CopyPasteKit.generateMarkdown(mockDraft);

      expect(result.metadata.title).toBe('New Feature Launch');
      expect(result.metadata.createdAt).toBe('2024-12-20T10:00:00Z');
      expect(result.metadata.platforms).toContain('instagram');
      expect(result.metadata.platforms).toContain('x');
    });

    it('should include character counts', () => {
      const result = CopyPasteKit.generateMarkdown(mockDraft);

      expect(result.metadata.characterCounts.instagram).toBe(47);
      expect(result.metadata.characterCounts.x).toBe(10);
    });

    it('should handle missing fields gracefully', () => {
      const minimalDraft: Partial<ContentDraft> = {
        id: 'draft-002',
        state: 'draft',
      };

      const result = CopyPasteKit.generateMarkdown(minimalDraft);

      expect(result.format).toBe('markdown');
      expect(result.content).toContain('# Untitled Draft');
      expect(result.metadata.title).toBe('Untitled');
    });

    it('should format captions as code blocks', () => {
      const result = CopyPasteKit.generateMarkdown(mockDraft);

      expect(result.content).toContain('```');
      expect(result.content).toContain('Check out our new feature! #shipping #devops');
    });
  });

  describe('generateHTML', () => {
    it('should generate HTML from markdown', async () => {
      const result = await CopyPasteKit.generateHTML(mockDraft);

      expect(result.format).toBe('html');
      expect(result.content).toContain('<h1>');
      expect(result.content).toContain('New Feature Launch');
    });

    it('should preserve metadata in HTML export', async () => {
      const result = await CopyPasteKit.generateHTML(mockDraft);

      expect(result.metadata.title).toBe('New Feature Launch');
      expect(result.metadata.platforms).toContain('instagram');
    });
  });

  describe('generateJSON', () => {
    it('should generate valid JSON export', () => {
      const result = CopyPasteKit.generateJSON(mockDraft);

      expect(result.format).toBe('json');
      const parsed = JSON.parse(result.content);
      expect(parsed.draft.title).toBe('New Feature Launch');
      expect(parsed.copy_paste_kit.instagram_caption).toBeTruthy();
    });

    it('should include draft metadata', () => {
      const result = CopyPasteKit.generateJSON(mockDraft);

      const parsed = JSON.parse(result.content);
      expect(parsed.metadata.totalCaptions).toBe(2);
      expect(parsed.metadata.platforms).toContain('instagram');
    });

    it('should be parseable and include all captions', () => {
      const result = CopyPasteKit.generateJSON(mockDraft);

      const parsed = JSON.parse(result.content);
      expect(parsed.captions).toHaveLength(2);
      expect(parsed.captions[0].platform).toBe('instagram');
    });
  });

  describe('generatePermalink', () => {
    it('should generate URL-safe permalink', () => {
      const permalink = CopyPasteKit.generatePermalink('draft-001', 'New Feature Launch');

      expect(permalink).toContain('/mission-control/content/draft/draft-001/');
      expect(permalink).toContain('new-feature-launch');
    });

    it('should handle titles with special characters', () => {
      const permalink = CopyPasteKit.generatePermalink('draft-001', 'Feature: Part 1 & Part 2!');

      expect(permalink).toContain('feature-part-1-part-2');
      expect(permalink).not.toContain('&');
      expect(permalink).not.toContain('!');
    });

    it('should collapse multiple hyphens', () => {
      const permalink = CopyPasteKit.generatePermalink('draft-001', 'New   Feature   Launch');

      expect(permalink).toContain('new-feature-launch');
      expect(permalink).not.toMatch(/--+/);
    });
  });

  describe('generateShareableLink', () => {
    it('should generate base64-encoded shareable link', () => {
      const link = CopyPasteKit.generateShareableLink('draft-001');

      expect(link).toContain('/share/draft/');
      expect(link).toContain(Buffer.from('draft-001').toString('base64'));
    });

    it('should respect custom base URL', () => {
      const link = CopyPasteKit.generateShareableLink('draft-001', 'https://custom.com');

      expect(link).toContain('https://custom.com/share/draft/');
    });

    it('should be reversible', () => {
      const draftId = 'draft-001';
      const link = CopyPasteKit.generateShareableLink(draftId);
      const encoded = link.split('/').pop();

      expect(Buffer.from(encoded || '', 'base64').toString()).toBe(draftId);
    });
  });

  describe('copyToClipboard', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should use navigator.clipboard when available', async () => {
      const mockClipboard = {
        writeText: vi.fn().mockResolvedValue(undefined),
      };

      Object.defineProperty(navigator, 'clipboard', {
        value: mockClipboard,
        writable: true,
        configurable: true,
      });

      await CopyPasteKit.copyToClipboard('test content');

      expect(mockClipboard.writeText).toHaveBeenCalledWith('test content');
    });

    it('should reject when clipboard not available', async () => {
      Object.defineProperty(navigator, 'clipboard', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      await expect(CopyPasteKit.copyToClipboard('test')).rejects.toThrow(
        'Clipboard API not available'
      );
    });
  });

  describe('copyPlatformCaption', () => {
    it('should copy Instagram caption to clipboard', async () => {
      const mockClipboard = {
        writeText: vi.fn().mockResolvedValue(undefined),
      };

      Object.defineProperty(navigator, 'clipboard', {
        value: mockClipboard,
        writable: true,
        configurable: true,
      });

      await CopyPasteKit.copyPlatformCaption(mockDraft, 'instagram');

      expect(mockClipboard.writeText).toHaveBeenCalledWith(
        'Check out our new feature! #shipping #devops'
      );
    });

    it('should throw error if no copy_paste_kit', async () => {
      const draftNoCopy: Partial<ContentDraft> = {
        id: 'draft-001',
        state: 'draft',
      };

      await expect(CopyPasteKit.copyPlatformCaption(draftNoCopy, 'instagram')).rejects.toThrow(
        'No copy_paste_kit in draft'
      );
    });

    it('should throw error if platform not found', async () => {
      await expect(CopyPasteKit.copyPlatformCaption(mockDraft, 'unknown_platform')).rejects.toThrow(
        'No content for platform: unknown_platform'
      );
    });
  });

  describe('downloadAsMarkdown', () => {
    it('should generate markdown for download', () => {
      const result = CopyPasteKit.generateMarkdown(mockDraft);
      const filename = `${mockDraft.id}-${mockDraft.title}.md`.replace(/\s+/g, '-');

      expect(result.content).toBeTruthy();
      expect(filename).toContain('draft-001');
      expect(filename).toContain('New-Feature-Launch');
    });
  });

  describe('Integration: Complete export workflow', () => {
    it('should export draft in all formats', async () => {
      const markdown = CopyPasteKit.generateMarkdown(mockDraft);
      const html = await CopyPasteKit.generateHTML(mockDraft);
      const json = CopyPasteKit.generateJSON(mockDraft);

      expect(markdown.format).toBe('markdown');
      expect(html.format).toBe('html');
      expect(json.format).toBe('json');

      expect(markdown.content).toContain('New Feature Launch');
      expect(html.content).toContain('New Feature Launch');
      expect(JSON.parse(json.content).draft.title).toBe('New Feature Launch');
    });

    it('should generate shareable and accessible links', () => {
      const permalink = CopyPasteKit.generatePermalink(mockDraft.id!, mockDraft.title!);
      const shareable = CopyPasteKit.generateShareableLink(mockDraft.id!);

      expect(permalink).toContain('/mission-control/content/draft/');
      expect(shareable).toContain('/share/draft/');
    });
  });
});
