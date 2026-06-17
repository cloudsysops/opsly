import { describe, expect, it } from 'vitest'
import {
  buildRecoveryRedirectTo,
  inviteActivationPathFromUrl,
  isInviteLink,
  isRecoveryLink,
} from '../auth-recovery'

describe('auth-recovery routing helpers', () => {
  it('builds the recovery redirect path via auth callback with next', () => {
    expect(buildRecoveryRedirectTo('https://portal.op-sly.com/')).toBe(
      'https://portal.op-sly.com/auth/callback?next=%2Fadmin%2Fupdate-password'
    )
    expect(
      buildRecoveryRedirectTo('https://portal.op-sly.com', { next: '/teacher/update-password' })
    ).toBe('https://portal.op-sly.com/auth/callback?next=%2Fteacher%2Fupdate-password')
  })

  it('detects recovery links from query and hash', () => {
    expect(new URL('https://portal.op-sly.com/login?type=recovery').toString()).toContain(
      'type=recovery'
    )
    expect(isRecoveryLink(new URL('https://portal.op-sly.com/login?type=recovery'))).toBe(true)
    expect(
      isRecoveryLink(new URL('https://portal.op-sly.com/login#access_token=abc&type=recovery'))
    ).toBe(true)
  })

  it('detects invite links and maps them to the invite activation page', () => {
    const inviteUrl = new URL(
      'https://portal.op-sly.com/login?type=invite&token=tok_123&email=cboteros1%40gmail.com'
    )

    expect(isInviteLink(inviteUrl)).toBe(true)
    expect(inviteActivationPathFromUrl(inviteUrl, 'https://portal.op-sly.com')).toBe(
      'https://portal.op-sly.com/invite/tok_123?email=cboteros1%40gmail.com'
    )
  })
})
