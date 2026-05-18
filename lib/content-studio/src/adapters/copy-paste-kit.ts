import { marked } from 'marked';
import type { ContentDraft } from '../types.js';

export interface ExportedKit {
  format: 'markdown' | 'html' | 'json';
  content: string;
  metadata: {
    title: string;
    createdAt: string;
    platforms: string[];
    characterCounts: Record<string, number>;
  };
}

export class CopyPasteKit {
  static generateMarkdown(draft: Partial<ContentDraft>): ExportedKit {
    const lines: string[] = [];

    lines.push(`# ${draft.title || 'Untitled Draft'}`);
    lines.push(`**Created:** ${draft.created_at || new Date().toISOString()}`);
    lines.push('');

    if (draft.story_hook) {
      lines.push('## Story Hook');
      lines.push(draft.story_hook);
      lines.push('');
    }

    if (draft.call_to_action) {
      lines.push('## Call to Action');
      lines.push(draft.call_to_action);
      lines.push('');
    }

    if (draft.copy_paste_kit) {
      lines.push('## Platform Captions');
      lines.push('');

      const kit = draft.copy_paste_kit;
      const platforms = [
        { key: 'instagram_caption', label: 'Instagram' },
        { key: 'facebook_caption', label: 'Facebook' },
        { key: 'linkedin_caption', label: 'LinkedIn' },
        { key: 'x_caption', label: 'X (Twitter)' },
        { key: 'tiktok_script', label: 'TikTok' },
        { key: 'youtube_shorts_script', label: 'YouTube Shorts' },
      ];

      platforms.forEach(({ key, label }) => {
        const value = kit[key as keyof typeof kit];
        if (value) {
          lines.push(`### ${label}`);
          lines.push('```');
          lines.push(value);
          lines.push('```');
          lines.push('');
        }
      });
    }

    if (draft.image_prompt) {
      lines.push('## Image Generation Prompt');
      lines.push(draft.image_prompt);
      lines.push('');
    }

    const content = lines.join('\n');
    const platforms = draft.copy_paste_kit
      ? Object.keys(draft.copy_paste_kit)
          .filter((k) => draft.copy_paste_kit![k as keyof typeof draft.copy_paste_kit])
          .map((k) => k.replace('_caption', '').replace('_script', ''))
      : [];

    const characterCounts: Record<string, number> = {};
    draft.captions?.forEach((cap) => {
      characterCounts[cap.platform] = cap.characterCount;
    });

    return {
      format: 'markdown',
      content,
      metadata: {
        title: draft.title || 'Untitled',
        createdAt: draft.created_at || new Date().toISOString(),
        platforms,
        characterCounts,
      },
    };
  }

  static async generateHTML(draft: Partial<ContentDraft>): Promise<ExportedKit> {
    const markdown = this.generateMarkdown(draft);
    const html = await marked(markdown.content);

    return {
      format: 'html',
      content: html,
      metadata: markdown.metadata,
    };
  }

  static generateJSON(draft: Partial<ContentDraft>): ExportedKit {
    const platforms = draft.copy_paste_kit
      ? Object.keys(draft.copy_paste_kit)
          .filter((k) => draft.copy_paste_kit![k as keyof typeof draft.copy_paste_kit])
          .map((k) => k.replace('_caption', '').replace('_script', ''))
      : [];

    const characterCounts: Record<string, number> = {};
    draft.captions?.forEach((cap) => {
      characterCounts[cap.platform] = cap.characterCount;
    });

    const json = {
      draft: {
        id: draft.id,
        title: draft.title,
        story_hook: draft.story_hook,
        call_to_action: draft.call_to_action,
        image_prompt: draft.image_prompt,
        state: draft.state,
        created_at: draft.created_at,
      },
      copy_paste_kit: draft.copy_paste_kit,
      captions: draft.captions,
      metadata: {
        platforms,
        characterCounts,
        totalCaptions: draft.captions?.length || 0,
      },
    };

    return {
      format: 'json',
      content: JSON.stringify(json, null, 2),
      metadata: {
        title: draft.title || 'Untitled',
        createdAt: draft.created_at || new Date().toISOString(),
        platforms,
        characterCounts,
      },
    };
  }

  static generatePermalink(draftId: string, title: string): string {
    const slug = title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');

    return `/mission-control/content/draft/${draftId}/${slug}`;
  }

  static generateShareableLink(draftId: string, baseUrl: string = 'https://opsly.io'): string {
    const encoded = Buffer.from(draftId).toString('base64');
    return `${baseUrl}/share/draft/${encoded}`;
  }

  static downloadAsMarkdown(draft: Partial<ContentDraft>, filename?: string): void {
    const kit = this.generateMarkdown(draft);
    const fn = filename || `${draft.id}-${draft.title}.md`.replace(/\s+/g, '-');

    if (typeof window !== 'undefined') {
      const blob = new Blob([kit.content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fn;
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  static copyToClipboard(text: string): Promise<void> {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      return navigator.clipboard.writeText(text);
    }
    return Promise.reject(new Error('Clipboard API not available'));
  }

  static async copyPlatformCaption(
    draft: Partial<ContentDraft>,
    platform: string,
  ): Promise<void> {
    const kit = draft.copy_paste_kit;
    if (!kit) throw new Error('No copy_paste_kit in draft');

    const platformKey = `${platform}_caption` as keyof typeof kit;
    const scriptKey = `${platform}_script` as keyof typeof kit;

    const content = kit[platformKey] || kit[scriptKey];
    if (!content) throw new Error(`No content for platform: ${platform}`);

    return this.copyToClipboard(content as string);
  }
}
