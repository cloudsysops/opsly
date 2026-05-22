import { describe, it, expect } from 'vitest';
import type { ContentEvent, TenantContentProfile } from '../types.js';

describe('Content Studio Types', () => {
  it('defines ContentEvent interface', () => {
    const event: ContentEvent = {
      id: 'evt-001',
      tenant_slug: 'acme-corp',
      event_type: 'deployment_success',
      timestamp: new Date().toISOString(),
      context: { duration: 120 },
      confidentiality: 'public',
    };
    expect(event.tenant_slug).toBe('acme-corp');
  });

  it('defines TenantContentProfile interface', () => {
    const profile: TenantContentProfile = {
      tenant_slug: 'acme-corp',
      brand_name: 'ACME',
      brand_color: '#FF0000',
      tone_of_voice: 'friendly',
      language: 'en',
      avatar_style: 'geometric',
      content_privacy: {
        hide_team_names: true,
        hide_metrics: false,
        hide_infrastructure: true,
        show_only_wins: true,
      },
    };
    expect(profile.brand_name).toBe('ACME');
  });
});
