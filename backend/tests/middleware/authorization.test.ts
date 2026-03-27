jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: {
    lead: { findUnique: jest.fn() },
    task: { findUnique: jest.fn() },
    activity: { findUnique: jest.fn() },
    note: { findUnique: jest.fn() },
    campaign: { findUnique: jest.fn() },
  },
}))

import prisma from '../../src/config/database'
import {
  canAccessLead,
  canAccessTask,
  canAccessActivity,
  canAccessNote,
  canAccessCampaign,
} from '../../src/middleware/authorization'

function makeMocks(user = { userId: 'user-1', role: 'USER', organizationId: 'org-1' }, paramId = 'res-1') {
  const req: any = {
    params: { id: paramId },
    user,
  }
  const res: any = {}
  const next = jest.fn()
  return { req, res, next }
}

describe('canAccessLead', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls next for ADMIN accessing any lead in same org', async () => {
    ;(prisma.lead.findUnique as jest.Mock).mockResolvedValue({
      id: 'lead-1', assignedToId: 'other', organizationId: 'org-1',
    })
    const { req, res, next } = makeMocks({ userId: 'admin-1', role: 'ADMIN', organizationId: 'org-1' }, 'lead-1')

    await canAccessLead(req, res, next)

    expect(next).toHaveBeenCalledWith()
  })

  it('calls next for user assigned to lead', async () => {
    ;(prisma.lead.findUnique as jest.Mock).mockResolvedValue({
      id: 'lead-1', assignedToId: 'user-1', organizationId: 'org-1',
    })
    const { req, res, next } = makeMocks({ userId: 'user-1', role: 'USER', organizationId: 'org-1' }, 'lead-1')

    await canAccessLead(req, res, next)

    expect(next).toHaveBeenCalledWith()
  })

  it('passes NotFoundError when lead does not exist', async () => {
    ;(prisma.lead.findUnique as jest.Mock).mockResolvedValue(null)
    const { req, res, next } = makeMocks()

    await canAccessLead(req, res, next)

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'Lead not found' }))
  })

  it('passes ForbiddenError when lead belongs to different org', async () => {
    ;(prisma.lead.findUnique as jest.Mock).mockResolvedValue({
      id: 'lead-1', assignedToId: 'user-1', organizationId: 'other-org',
    })
    const { req, res, next } = makeMocks()

    await canAccessLead(req, res, next)

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('permission') })
    )
  })

  it('passes ForbiddenError when user is not assigned to lead', async () => {
    ;(prisma.lead.findUnique as jest.Mock).mockResolvedValue({
      id: 'lead-1', assignedToId: 'other-user', organizationId: 'org-1',
    })
    const { req, res, next } = makeMocks()

    await canAccessLead(req, res, next)

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('permission') })
    )
  })
})

describe('canAccessTask', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls next for ADMIN', async () => {
    ;(prisma.task.findUnique as jest.Mock).mockResolvedValue({
      id: 'task-1', assignedToId: 'other', organizationId: 'org-1',
    })
    const { req, res, next } = makeMocks({ userId: 'admin-1', role: 'ADMIN', organizationId: 'org-1' }, 'task-1')

    await canAccessTask(req, res, next)

    expect(next).toHaveBeenCalledWith()
  })

  it('calls next for assigned user', async () => {
    ;(prisma.task.findUnique as jest.Mock).mockResolvedValue({
      id: 'task-1', assignedToId: 'user-1', organizationId: 'org-1',
    })
    const { req, res, next } = makeMocks()

    await canAccessTask(req, res, next)

    expect(next).toHaveBeenCalledWith()
  })

  it('passes not found error when task does not exist', async () => {
    ;(prisma.task.findUnique as jest.Mock).mockResolvedValue(null)
    const { req, res, next } = makeMocks()

    await canAccessTask(req, res, next)

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'Task not found' }))
  })

  it('passes forbidden when not assigned', async () => {
    ;(prisma.task.findUnique as jest.Mock).mockResolvedValue({
      id: 'task-1', assignedToId: 'other', organizationId: 'org-1',
    })
    const { req, res, next } = makeMocks()

    await canAccessTask(req, res, next)

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('permission') })
    )
  })
})

describe('canAccessActivity', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls next for ADMIN', async () => {
    ;(prisma.activity.findUnique as jest.Mock).mockResolvedValue({
      id: 'act-1', userId: 'other', organizationId: 'org-1',
    })
    const { req, res, next } = makeMocks({ userId: 'admin-1', role: 'ADMIN', organizationId: 'org-1' })

    await canAccessActivity(req, res, next)

    expect(next).toHaveBeenCalledWith()
  })

  it('calls next for activity owner', async () => {
    ;(prisma.activity.findUnique as jest.Mock).mockResolvedValue({
      id: 'act-1', userId: 'user-1', organizationId: 'org-1',
    })
    const { req, res, next } = makeMocks()

    await canAccessActivity(req, res, next)

    expect(next).toHaveBeenCalledWith()
  })

  it('passes not found error', async () => {
    ;(prisma.activity.findUnique as jest.Mock).mockResolvedValue(null)
    const { req, res, next } = makeMocks()

    await canAccessActivity(req, res, next)

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'Activity not found' }))
  })
})

describe('canAccessNote', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls next for ADMIN', async () => {
    ;(prisma.note.findUnique as jest.Mock).mockResolvedValue({
      id: 'note-1', authorId: 'other', lead: { assignedToId: 'other', organizationId: 'org-1' },
    })
    const { req, res, next } = makeMocks({ userId: 'admin-1', role: 'ADMIN', organizationId: 'org-1' })

    await canAccessNote(req, res, next)

    expect(next).toHaveBeenCalledWith()
  })

  it('calls next for note author', async () => {
    ;(prisma.note.findUnique as jest.Mock).mockResolvedValue({
      id: 'note-1', authorId: 'user-1', lead: { assignedToId: 'other', organizationId: 'org-1' },
    })
    const { req, res, next } = makeMocks()

    await canAccessNote(req, res, next)

    expect(next).toHaveBeenCalledWith()
  })

  it('calls next for lead assignee', async () => {
    ;(prisma.note.findUnique as jest.Mock).mockResolvedValue({
      id: 'note-1', authorId: 'other', lead: { assignedToId: 'user-1', organizationId: 'org-1' },
    })
    const { req, res, next } = makeMocks()

    await canAccessNote(req, res, next)

    expect(next).toHaveBeenCalledWith()
  })

  it('passes not found error', async () => {
    ;(prisma.note.findUnique as jest.Mock).mockResolvedValue(null)
    const { req, res, next } = makeMocks()

    await canAccessNote(req, res, next)

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'Note not found' }))
  })
})

describe('canAccessCampaign', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls next for ADMIN', async () => {
    ;(prisma.campaign.findUnique as jest.Mock).mockResolvedValue({
      id: 'camp-1', createdById: 'other', organizationId: 'org-1',
    })
    const { req, res, next } = makeMocks({ userId: 'admin-1', role: 'ADMIN', organizationId: 'org-1' })

    await canAccessCampaign(req, res, next)

    expect(next).toHaveBeenCalledWith()
  })

  it('calls next for campaign creator', async () => {
    ;(prisma.campaign.findUnique as jest.Mock).mockResolvedValue({
      id: 'camp-1', createdById: 'user-1', organizationId: 'org-1',
    })
    const { req, res, next } = makeMocks()

    await canAccessCampaign(req, res, next)

    expect(next).toHaveBeenCalledWith()
  })

  it('passes not found error', async () => {
    ;(prisma.campaign.findUnique as jest.Mock).mockResolvedValue(null)
    const { req, res, next } = makeMocks()

    await canAccessCampaign(req, res, next)

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'Campaign not found' }))
  })

  it('passes forbidden when user did not create campaign', async () => {
    ;(prisma.campaign.findUnique as jest.Mock).mockResolvedValue({
      id: 'camp-1', createdById: 'other', organizationId: 'org-1',
    })
    const { req, res, next } = makeMocks()

    await canAccessCampaign(req, res, next)

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('permission') })
    )
  })
})
