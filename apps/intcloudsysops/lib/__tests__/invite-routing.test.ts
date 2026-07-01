import { describe, expect, it } from 'vitest'
import { resolveInviteActivationRedirectPath } from '../invite-routing'

describe('resolveInviteActivationRedirectPath', () => {
  it('routes support and teacher invite activations to their own dashboards', () => {
    expect(
      resolveInviteActivationRedirectPath({
        tenant_slug: 'peskids',
        role: 'support',
      })
    ).toBe('https://peskids.op-sly.com/support/dashboard')

    expect(
      resolveInviteActivationRedirectPath({
        tenant_slug: 'peskids',
        role: 'teacher',
      })
    ).toBe('https://peskids.op-sly.com/teacher/dashboard')
  })

  it('routes admin and owner invite activations to the admin dashboard', () => {
    expect(
      resolveInviteActivationRedirectPath({
        tenant_slug: 'peskids',
        role: 'admin',
      })
    ).toBe('https://peskids.op-sly.com/admin')

    expect(
      resolveInviteActivationRedirectPath({
        tenant_slug: 'peskids',
        role: 'owner',
      })
    ).toBe('https://peskids.op-sly.com/admin')
  })
})
