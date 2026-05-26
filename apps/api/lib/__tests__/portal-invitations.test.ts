import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sendPortalInvitationForTenant } from '../portal-invitations';
import * as emailMod from '../email';
import * as supabaseMod from '../supabase';

vi.mock('../supabase', () => ({
  getServiceClient: vi.fn(),
}));

vi.mock('../email', () => ({
  escapeHtml: (value: string) => value,
  getInviteFromEmail: vi.fn(() => 'invite@opsly.sh'),
  sendHtmlEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../email/delivery-mode', () => ({
  isEmailDeliverySkipped: vi.fn(() => false),
  isNonFatalEmailDeliveryError: vi.fn(() => false),
}));

describe('sendPortalInvitationForTenant', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test-key';
  });

  it('uses the peskids base when inviting peskids owners', async () => {
    const generateLink = vi.fn().mockResolvedValue({
      data: {
        properties: {
          action_link:
            'https://jkwykpldnitavhmtuzmo.supabase.co/auth/v1/verify?token=tok_123&type=invite',
        },
      },
      error: null,
    });
    vi.mocked(supabaseMod.getServiceClient).mockReturnValue({
      auth: { admin: { generateLink } },
    } as never);

    const result = await sendPortalInvitationForTenant({
      email: 'peskids.admin@gmail.com',
      name: 'Peskids Admin',
      slug: 'peskids',
    });

    expect(result.link).toBe(
      'http://localhost:3004/invite/tok_123?email=peskids.admin%40gmail.com'
    );
    expect(generateLink).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'invite',
        email: 'peskids.admin@gmail.com',
        options: expect.objectContaining({
          redirectTo: 'http://localhost:3004/invite',
          data: expect.objectContaining({
            tenant_slug: 'peskids',
          }),
        }),
      })
    );
    expect(emailMod.sendHtmlEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'peskids.admin@gmail.com',
        html: expect.stringContaining(
          'http://localhost:3004/invite/tok_123?email=peskids.admin%40gmail.com'
        ),
      })
    );
    expect(emailMod.sendHtmlEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining('http://localhost:3004/admin/login'),
      })
    );
    expect(emailMod.sendHtmlEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: 'Tu acceso al panel de Peskids está listo',
        html: expect.stringContaining('http://localhost:3004/brand/logo-reference.png'),
      })
    );
  });

  it('uses the portal base for non-peskids tenants', async () => {
    const generateLink = vi.fn().mockResolvedValue({
      data: {
        properties: {
          action_link:
            'https://jkwykpldnitavhmtuzmo.supabase.co/auth/v1/verify?token=tok_456&type=invite',
        },
      },
      error: null,
    });
    vi.mocked(supabaseMod.getServiceClient).mockReturnValue({
      auth: { admin: { generateLink } },
    } as never);

    const result = await sendPortalInvitationForTenant({
      email: 'owner@acme.com',
      name: 'Acme',
      slug: 'acme',
    });

    expect(result.link).toBe('http://localhost:3002/invite/tok_456?email=owner%40acme.com');
    expect(emailMod.sendHtmlEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining('http://localhost:3002/login'),
      })
    );
  });
});
