import { describe, expect, it } from 'vitest';

import { getPortalInviteBranding } from '../src/invite-branding.js';
import { resolveIncubatedTenantSiteUrl } from '../src/site-url.js';
import type { TenantProfile } from '../src/types.js';

const peskids: TenantProfile = {
  tenant_name: 'Peskids',
  tenant_slug: 'peskids',
  schema_name: 'peskids',
  platform_domain: 'op-sly.com',
  public_url: 'https://peskids.op-sly.com',
  internal_port: 3004,
  stack_type: 'incubator-app',
  staff_login_path: '/admin/login',
};

describe('resolveIncubatedTenantSiteUrl', () => {
  it('uses public_url when set', () => {
    expect(resolveIncubatedTenantSiteUrl(peskids, true)).toBe('https://peskids.op-sly.com');
  });

  it('uses localhost in dev when internal_port set', () => {
    const dev = { ...peskids, public_url: undefined };
    expect(resolveIncubatedTenantSiteUrl(dev, false)).toBe('http://localhost:3004');
  });
});

describe('getPortalInviteBranding', () => {
  it('returns tenant_name and logo for incubator app', () => {
    const branding = getPortalInviteBranding(peskids, 'https://peskids.op-sly.com');
    expect(branding.brandName).toBe('Peskids');
    expect(branding.logoUrl).toBe('https://peskids.op-sly.com/brand/logo-reference.png');
    expect(branding.emailSubject).toContain('Peskids');
  });
});
