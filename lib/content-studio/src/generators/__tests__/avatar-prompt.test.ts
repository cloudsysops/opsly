import { describe, it, expect } from 'vitest';
import { generateAvatarPrompt, generateAvatarPrompts } from '../avatar-prompt.js';
import type { TenantContentProfile } from '../../types.js';

describe('AvatarPromptGenerator', () => {
  const mockProfile: TenantContentProfile = {
    tenant_slug: 'test-tenant',
    brand_name: 'TestBrand',
    brand_color: '#FF5733',
    avatar_style: 'minimal',
    content_tone: 'professional',
    primary_platform: 'linkedin',
  };

  it('should generate minimal avatar prompt', () => {
    const prompt = generateAvatarPrompt(mockProfile);

    expect(prompt.style).toBe('minimal');
    expect(prompt.description).toBe('Clean, geometric shapes, modern aesthetic');
    expect(prompt.color).toBe('#FF5733');
    expect(prompt.prompt).toContain('TestBrand');
    expect(prompt.prompt).toContain('minimal');
    expect(prompt.prompt).toContain('#FF5733');
  });

  it('should generate geometric avatar prompt', () => {
    const prompt = generateAvatarPrompt({
      ...mockProfile,
      avatar_style: 'geometric',
    });

    expect(prompt.style).toBe('geometric');
    expect(prompt.description).toBe('Bold geometric patterns, contemporary');
    expect(prompt.prompt).toContain('geometric');
  });

  it('should generate illustrated avatar prompt', () => {
    const prompt = generateAvatarPrompt({
      ...mockProfile,
      avatar_style: 'illustrated',
    });

    expect(prompt.style).toBe('illustrated');
    expect(prompt.description).toBe('Hand-drawn illustration style');
    expect(prompt.prompt).toContain('hand-drawn');
  });

  it('should generate photo avatar prompt', () => {
    const prompt = generateAvatarPrompt({
      ...mockProfile,
      avatar_style: 'photo',
    });

    expect(prompt.style).toBe('photo');
    expect(prompt.description).toBe('Professional photography');
    expect(prompt.prompt).toContain('professional photo');
  });

  it('should include brand color in all prompts', () => {
    const styles = ['minimal', 'geometric', 'illustrated', 'photo'] as const;

    styles.forEach((style) => {
      const prompt = generateAvatarPrompt({
        ...mockProfile,
        avatar_style: style,
      });

      expect(prompt.prompt).toContain('#FF5733');
    });
  });

  it('should default to minimal style if not specified', () => {
    const profile: TenantContentProfile = {
      ...mockProfile,
      avatar_style: undefined,
    };

    const prompt = generateAvatarPrompt(profile);
    expect(prompt.style).toBe('minimal');
  });

  it('should throw error for unknown avatar style', () => {
    expect(() =>
      generateAvatarPrompt({
        ...mockProfile,
        avatar_style: 'unknown' as any,
      }),
    ).toThrow('Unknown avatar style');
  });

  it('should generate multiple avatar prompts for different styles', () => {
    const prompts = generateAvatarPrompts(mockProfile, [
      'minimal',
      'geometric',
      'illustrated',
    ]);

    expect(prompts).toHaveLength(3);
    expect(prompts[0].style).toBe('minimal');
    expect(prompts[1].style).toBe('geometric');
    expect(prompts[2].style).toBe('illustrated');
  });

  it('should default to minimal when no styles specified', () => {
    const prompts = generateAvatarPrompts(mockProfile);

    expect(prompts).toHaveLength(1);
    expect(prompts[0].style).toBe('minimal');
  });

  it('should all prompt variants include 512x512px specification', () => {
    const styles = ['minimal', 'geometric', 'illustrated', 'photo'] as const;

    styles.forEach((style) => {
      const prompt = generateAvatarPrompt({
        ...mockProfile,
        avatar_style: style,
      });

      expect(prompt.prompt).toContain('512x512');
    });
  });
});
