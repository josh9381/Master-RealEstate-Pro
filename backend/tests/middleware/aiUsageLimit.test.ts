jest.mock('../../src/services/usage-tracking.service', () => ({
  checkUsageLimit: jest.fn(),
  incrementAIUsage: jest.fn(),
  getMonthlyUsage: jest.fn(),
}))
jest.mock('../../src/config/subscriptions', () => ({
  getUpgradeMessage: jest.fn().mockReturnValue('Please upgrade'),
}))
jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: {
    organization: { findUnique: jest.fn() },
  },
}))
jest.mock('../../src/lib/logger', () => ({
  logger: { warn: jest.fn(), error: jest.fn() },
}))

import { checkUsageLimit, incrementAIUsage, getMonthlyUsage } from '../../src/services/usage-tracking.service'
import prisma from '../../src/config/database'
import { checkAIUsage } from '../../src/middleware/aiUsageLimit'

function makeMocks(user = { organizationId: 'org-1' }) {
  const req: any = { user }
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  }
  const next = jest.fn()
  return { req, res, next }
}

describe('checkAIUsage', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    const middleware = checkAIUsage('aiMessages' as any)
    const { req, res, next } = makeMocks(undefined as any)
    req.user = undefined

    await middleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 429 when usage limit is exceeded', async () => {
    ;(checkUsageLimit as jest.Mock).mockResolvedValue({
      allowed: false,
      used: 100,
      limit: 100,
      remaining: 0,
      tier: 'FREE',
    })

    const middleware = checkAIUsage('aiMessages' as any)
    const { req, res, next } = makeMocks()

    await middleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(429)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining('limit reached'),
      })
    )
    expect(next).not.toHaveBeenCalled()
  })

  it('calls next and pre-increments usage when allowed', async () => {
    ;(checkUsageLimit as jest.Mock).mockResolvedValue({
      allowed: true,
      used: 5,
      limit: 100,
      remaining: 95,
      tier: 'PRO',
      useOwnKey: false,
    })
    ;(incrementAIUsage as jest.Mock).mockResolvedValue(undefined)
    ;(prisma.organization.findUnique as jest.Mock).mockResolvedValue(null)

    const middleware = checkAIUsage('aiMessages' as any)
    const { req, res, next } = makeMocks()

    await middleware(req, res, next)

    expect(incrementAIUsage).toHaveBeenCalledWith('org-1', 'aiMessages')
    expect(next).toHaveBeenCalled()
    expect(req.aiUsage).toEqual(
      expect.objectContaining({
        type: 'aiMessages',
        preIncremented: true,
      })
    )
  })

  it('returns 429 when budget hard limit is exceeded', async () => {
    ;(checkUsageLimit as jest.Mock).mockResolvedValue({
      allowed: true,
      used: 5,
      limit: 100,
      remaining: 95,
      tier: 'PRO',
    })
    ;(incrementAIUsage as jest.Mock).mockResolvedValue(undefined)
    ;(prisma.organization.findUnique as jest.Mock).mockResolvedValue({
      aiBudgetHardLimit: 50,
      aiBudgetAlertEnabled: true,
    })
    ;(getMonthlyUsage as jest.Mock).mockResolvedValue({ totalCost: 55 })

    const middleware = checkAIUsage('aiMessages' as any)
    const { req, res, next } = makeMocks()

    await middleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(429)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ budgetExceeded: true }),
      })
    )
  })

  it('lets request through when usage check throws an error', async () => {
    ;(checkUsageLimit as jest.Mock).mockRejectedValue(new Error('DB down'))

    const middleware = checkAIUsage('aiMessages' as any)
    const { req, res, next } = makeMocks()

    await middleware(req, res, next)

    expect(next).toHaveBeenCalled()
  })
})
