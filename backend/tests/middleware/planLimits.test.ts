jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: undefined,
  prisma: {
    organization: { findUnique: jest.fn() },
    user: { count: jest.fn() },
    lead: { count: jest.fn() },
    pipeline: { count: jest.fn() },
    campaign: { count: jest.fn() },
    workflow: { count: jest.fn() },
    message: { count: jest.fn() },
  },
}))
jest.mock('../../src/config/subscriptions', () => ({
  checkUsageLimit: jest.fn(),
  getUpgradeMessage: jest.fn().mockReturnValue('Upgrade to PRO'),
}))
jest.mock('../../src/lib/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn() },
}))

// Re-import after mocks
import { prisma } from '../../src/config/database'
import { checkUsageLimit, getUpgradeMessage } from '../../src/config/subscriptions'
import { enforcePlanLimit, checkMonthlyMessageLimit } from '../../src/middleware/planLimits'

function makeMocks(user = { organizationId: 'org-1' }) {
  const req: any = { user }
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  }
  const next = jest.fn()
  return { req, res, next }
}

describe('enforcePlanLimit', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when user is not authenticated', async () => {
    const middleware = enforcePlanLimit('leads')
    const { req, res, next } = makeMocks(undefined as any)
    req.user = undefined

    await middleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 404 when org is not found', async () => {
    ;(prisma.organization.findUnique as jest.Mock).mockResolvedValue(null)
    const middleware = enforcePlanLimit('leads')
    const { req, res, next } = makeMocks()

    await middleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('returns 403 when plan limit is reached', async () => {
    ;(prisma.organization.findUnique as jest.Mock).mockResolvedValue({ subscriptionTier: 'STARTER' })
    ;(prisma.lead.count as jest.Mock).mockResolvedValue(100)
    ;(checkUsageLimit as jest.Mock).mockReturnValue({ isAtLimit: true, limit: 100, remaining: 0 })

    const middleware = enforcePlanLimit('leads')
    const { req, res, next } = makeMocks()

    await middleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining('limit reached'),
      })
    )
  })

  it('calls next and attaches planLimit when under limit', async () => {
    ;(prisma.organization.findUnique as jest.Mock).mockResolvedValue({ subscriptionTier: 'PRO' })
    ;(prisma.lead.count as jest.Mock).mockResolvedValue(50)
    ;(checkUsageLimit as jest.Mock).mockReturnValue({ isAtLimit: false, limit: 500, remaining: 450 })

    const middleware = enforcePlanLimit('leads')
    const { req, res, next } = makeMocks()

    await middleware(req, res, next)

    expect(next).toHaveBeenCalled()
    expect(req.planLimit).toEqual(
      expect.objectContaining({ resource: 'leads', current: 50, limit: 500 })
    )
  })

  it('lets request through when limit check throws', async () => {
    ;(prisma.organization.findUnique as jest.Mock).mockRejectedValue(new Error('DB down'))

    const middleware = enforcePlanLimit('leads')
    const { req, res, next } = makeMocks()

    await middleware(req, res, next)

    expect(next).toHaveBeenCalled()
  })
})

describe('checkMonthlyMessageLimit', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns not allowed when org is missing', async () => {
    ;(prisma.organization.findUnique as jest.Mock).mockResolvedValue(null)

    const result = await checkMonthlyMessageLimit('org-1', 'emails')

    expect(result.allowed).toBe(false)
    expect(result.sent).toBe(0)
  })

  it('returns allowed when under email limit', async () => {
    ;(prisma.organization.findUnique as jest.Mock).mockResolvedValue({ subscriptionTier: 'PROFESSIONAL' })
    ;(prisma.message.count as jest.Mock).mockResolvedValue(100)
    ;(checkUsageLimit as jest.Mock).mockReturnValue({ isAtLimit: false, limit: 5000, remaining: 4900 })

    const result = await checkMonthlyMessageLimit('org-1', 'emails')

    expect(result.allowed).toBe(true)
    expect(result.sent).toBe(100)
    expect(result.tier).toBe('PROFESSIONAL')
  })

  it('returns not allowed when SMS limit exceeded', async () => {
    ;(prisma.organization.findUnique as jest.Mock).mockResolvedValue({ subscriptionTier: 'STARTER' })
    ;(prisma.message.count as jest.Mock).mockResolvedValue(500)
    ;(checkUsageLimit as jest.Mock).mockReturnValue({ isAtLimit: true, limit: 500, remaining: 0 })

    const result = await checkMonthlyMessageLimit('org-1', 'sms')

    expect(result.allowed).toBe(false)
  })
})
