import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

const { resolveTwentyEnvMock, resolveWacrmForTenantMock, resolveWompiForTenantMock } = vi.hoisted(
  () => ({
    resolveTwentyEnvMock: vi.fn(),
    resolveWacrmForTenantMock: vi.fn(),
    resolveWompiForTenantMock: vi.fn(),
  })
)

vi.mock('@intcloudsysops/services/twenty', () => ({
  resolveTwentyEnv: resolveTwentyEnvMock,
}))

vi.mock('@intcloudsysops/wacrm-channel', () => ({
  resolveWacrmForTenant: resolveWacrmForTenantMock,
}))

vi.mock('@intcloudsysops/wompi-gateway', () => ({
  resolveWompiForTenant: resolveWompiForTenantMock,
}))

import { getIntegrationsStatus } from '../services/integrations-status.service'

describe('getIntegrationsStatus', () => {
  const originalStripeKey = process.env.STRIPE_SECRET_KEY

  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.STRIPE_SECRET_KEY
  })

  afterEach(() => {
    process.env.STRIPE_SECRET_KEY = originalStripeKey
  })

  it('reports connected when every provider is enabled/configured', () => {
    resolveTwentyEnvMock.mockReturnValue({ enabled: true })
    resolveWacrmForTenantMock.mockReturnValue({ enabled: true })
    resolveWompiForTenantMock.mockReturnValue({ enabled: true })
    process.env.STRIPE_SECRET_KEY = 'sk_test_123'

    const status = getIntegrationsStatus()

    expect(status.twenty.status).toBe('connected')
    expect(status.wacrm.status).toBe('connected')
    expect(status.wompi.status).toBe('connected')
    expect(status.stripe.status).toBe('connected')
  })

  it('reports not_configured for Twenty/Stripe and disabled for wacrm/Wompi when off', () => {
    resolveTwentyEnvMock.mockReturnValue({ enabled: false })
    resolveWacrmForTenantMock.mockReturnValue({ enabled: false })
    resolveWompiForTenantMock.mockReturnValue({ enabled: false })

    const status = getIntegrationsStatus()

    expect(status.twenty.status).toBe('not_configured')
    expect(status.wacrm.status).toBe('disabled')
    expect(status.wompi.status).toBe('disabled')
    expect(status.stripe.status).toBe('not_configured')
  })

  it('treats a null tenant config (misconfigured) as disabled rather than throwing', () => {
    resolveTwentyEnvMock.mockReturnValue({ enabled: false })
    resolveWacrmForTenantMock.mockReturnValue(null)
    resolveWompiForTenantMock.mockReturnValue(null)

    expect(() => getIntegrationsStatus()).not.toThrow()
    const status = getIntegrationsStatus()
    expect(status.wacrm.status).toBe('disabled')
    expect(status.wompi.status).toBe('disabled')
  })
})
