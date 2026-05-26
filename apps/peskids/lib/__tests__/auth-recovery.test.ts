import { describe, expect, it } from 'vitest';
import {
  inviteActivationPathFromUrl,
  isInviteLink,
  recoveryTargetFromMetadata,
} from '../auth-recovery';

describe('recoveryTargetFromMetadata', () => {
  it('routes peskids staff to peskids origin', () => {
    const target = recoveryTargetFromMetadata({ tenant_slug: 'peskids', role: 'admin' });
    expect(target.app).toBe('peskids_staff');
    expect(target.origin).toContain('peskids');
    expect(target.updatePasswordPath).toBe('/admin/update-password');
  });

  it('routes support recovery to the support update-password page', () => {
    const target = recoveryTargetFromMetadata({ tenant_slug: 'peskids', role: 'support' })
    expect(target.app).toBe('peskids_staff')
    expect(target.updatePasswordPath).toBe('/support/update-password')
  })

  it('routes teacher recovery to the teacher update-password page', () => {
    const target = recoveryTargetFromMetadata({ tenant_slug: 'peskids', role: 'teacher' })
    expect(target.app).toBe('peskids_staff')
    expect(target.updatePasswordPath).toBe('/teacher/update-password')
  })

  it('routes smiletripcare tenant to portal', () => {
    const target = recoveryTargetFromMetadata({ tenant_slug: 'smiletripcare', role: 'owner' });
    expect(target.app).toBe('portal');
    expect(target.origin).toContain('portal');
  });

  it('routes platform superuser to admin', () => {
    const target = recoveryTargetFromMetadata({
      tenant_slug: 'intcloudsysops',
      role: 'admin',
      is_superuser: true,
    });
    expect(target.app).toBe('platform_admin');
    expect(target.origin).toContain('admin');
  });

  it('detects invite links and keeps email/token in the activation path', () => {
    const inviteUrl = new URL(
      'https://peskids.op-sly.com/admin/login?type=invite&token=tok_123&email=cboteros1%40gmail.com'
    );
    expect(isInviteLink(inviteUrl)).toBe(true);
    expect(inviteActivationPathFromUrl(inviteUrl, 'https://peskids.op-sly.com')).toBe(
      'https://peskids.op-sly.com/invite/tok_123?email=cboteros1%40gmail.com'
    );
  });
});
