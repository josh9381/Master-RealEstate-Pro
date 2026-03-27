jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: {
    activity: {
      create: jest.fn(),
    },
  },
}))
jest.mock('../../src/lib/logger', () => ({
  logger: { error: jest.fn() },
}))

import prisma from '../../src/config/database'
import { logger } from '../../src/lib/logger'
import { logActivity } from '../../src/utils/activityLogger'

describe('activityLogger', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('creates an activity record with required fields', async () => {
    ;(prisma.activity.create as jest.Mock).mockResolvedValue({})

    await logActivity({
      type: 'LEAD_CREATED',
      title: 'New lead created',
      organizationId: 'org-1',
    })

    expect(prisma.activity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'LEAD_CREATED',
        title: 'New lead created',
        organizationId: 'org-1',
      }),
    })
  })

  it('creates an activity record with optional fields', async () => {
    ;(prisma.activity.create as jest.Mock).mockResolvedValue({})

    await logActivity({
      type: 'EMAIL_SENT',
      title: 'Email sent',
      description: 'Follow-up email',
      leadId: 'lead-1',
      userId: 'user-1',
      organizationId: 'org-1',
      campaignId: 'camp-1',
      metadata: { templateId: 'tpl-1', sentCount: 5 },
    })

    expect(prisma.activity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'EMAIL_SENT',
        title: 'Email sent',
        description: 'Follow-up email',
        leadId: 'lead-1',
        userId: 'user-1',
        organizationId: 'org-1',
        campaignId: 'camp-1',
        metadata: { templateId: 'tpl-1', sentCount: 5 },
      }),
    })
  })

  it('logs error but does not throw on failure', async () => {
    const dbError = new Error('DB down')
    ;(prisma.activity.create as jest.Mock).mockRejectedValue(dbError)

    await expect(
      logActivity({
        type: 'NOTE_ADDED',
        title: 'Note added',
        organizationId: 'org-1',
      })
    ).resolves.toBeUndefined()

    expect(logger.error).toHaveBeenCalledWith('Failed to log activity:', dbError)
  })

  it('passes undefined metadata when not provided', async () => {
    ;(prisma.activity.create as jest.Mock).mockResolvedValue({})

    await logActivity({
      type: 'TASK_CREATED',
      title: 'Task created',
      organizationId: 'org-1',
    })

    const callData = (prisma.activity.create as jest.Mock).mock.calls[0][0].data
    expect(callData.metadata).toBeUndefined()
  })
})
