/**
 * Tests for AIFunctionsService.executeFunction()
 * Verifies individual function handlers work correctly with mocked Prisma,
 * permission gates, audit logging, and error handling.
 */
import { mockDeep, mockReset } from 'jest-mock-extended'
import type { PrismaClient } from '@prisma/client'

const mockPrisma = mockDeep<PrismaClient>()
jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: mockPrisma,
  prisma: mockPrisma,
}))

jest.mock('../../src/services/openai.service', () => ({
  getOpenAIService: jest.fn(() => ({
    chat: jest.fn().mockResolvedValue({ response: 'Composed email', tokens: 50, cost: 0.001 }),
  })),
  ASSISTANT_TONES: {},
}))

jest.mock('../../src/services/intelligence.service', () => ({
  getIntelligenceService: jest.fn(() => ({
    enhanceMessage: jest.fn().mockResolvedValue('Enhanced'),
    suggestActions: jest.fn().mockResolvedValue([]),
    leadScoring: { predictScore: jest.fn().mockResolvedValue(75) },
  })),
}))

jest.mock('../../src/services/email.service', () => ({
  sendEmail: jest.fn().mockResolvedValue({ success: true, messageId: 'msg-1' }),
}))

jest.mock('../../src/services/sms.service', () => ({
  sendSMS: jest.fn().mockResolvedValue({ success: true, sid: 'sms-1' }),
}))

import { getAIFunctionsService, DESTRUCTIVE_FUNCTIONS, ADMIN_ONLY_FUNCTIONS, READ_ONLY_FUNCTIONS } from '../../src/services/ai-functions.service'

const service = getAIFunctionsService()

beforeEach(() => {
  jest.clearAllMocks()
  mockReset(mockPrisma)
  // Default: audit log creation succeeds
  mockPrisma.activity.create.mockResolvedValue({} as any)
})

// ───────────────────────────────────────────
// 1. PERMISSION GATES
// ───────────────────────────────────────────
describe('executeFunction – permission gates', () => {
  it('blocks admin-only functions for AGENT role', async () => {
    const result = await service.executeFunction(
      'bulk_delete_leads',
      { leadIds: ['lead-1'] },
      'org-1',
      'user-1',
      'AGENT',
    )
    const parsed = JSON.parse(result)
    expect(parsed.error).toContain('Permission denied')
  })

  it('allows admin-only functions for ADMIN role', async () => {
    mockPrisma.lead.deleteMany.mockResolvedValue({ count: 1 })
    const result = await service.executeFunction(
      'bulk_delete_leads',
      { leadIds: ['lead-1'] },
      'org-1',
      'user-1',
      'ADMIN',
    )
    const parsed = JSON.parse(result)
    expect(parsed.error).toBeUndefined()
  })

  it('allows admin-only functions for MANAGER role', async () => {
    mockPrisma.lead.deleteMany.mockResolvedValue({ count: 1 })
    const result = await service.executeFunction(
      'bulk_delete_leads',
      { leadIds: ['lead-1'] },
      'org-1',
      'user-1',
      'MANAGER',
    )
    const parsed = JSON.parse(result)
    // Should not be permission-denied (no error or not a permission error)
    expect(parsed.error || '').not.toContain('Permission denied')
  })
})

// ───────────────────────────────────────────
// 2. AUDIT LOGGING FOR DESTRUCTIVE ACTIONS
// ───────────────────────────────────────────
describe('executeFunction – audit logging', () => {
  it('creates audit log for destructive actions', async () => {
    mockPrisma.lead.findFirst.mockResolvedValue({ id: 'lead-1', organizationId: 'org-1' } as any)
    mockPrisma.lead.delete.mockResolvedValue({} as any)

    await service.executeFunction(
      'delete_lead',
      { leadId: 'lead-1' },
      'org-1',
      'user-1',
      'ADMIN',
    )

    // Should create an audit activity
    expect(mockPrisma.activity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: expect.stringContaining('delete_lead'),
          description: expect.stringContaining('Destructive action'),
        }),
      }),
    )
  })

  it('does not create audit log for read-only actions', async () => {
    mockPrisma.lead.count.mockResolvedValue(42)

    await service.executeFunction(
      'get_lead_count',
      {},
      'org-1',
      'user-1',
      'ADMIN',
    )

    // No audit log for non-destructive actions
    expect(mockPrisma.activity.create).not.toHaveBeenCalled()
  })
})

// ───────────────────────────────────────────
// 3. LEAD CRUD HANDLERS
// ───────────────────────────────────────────
describe('executeFunction – lead operations', () => {
  it('create_lead creates a lead in the database', async () => {
    mockPrisma.lead.create.mockResolvedValue({
      id: 'new-lead-1',
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@test.com',
      phone: null,
      status: 'NEW',
      score: 50,
    } as any)

    const result = await service.executeFunction(
      'create_lead',
      { firstName: 'Jane', lastName: 'Doe', email: 'jane@test.com' },
      'org-1',
      'user-1',
      'ADMIN',
    )
    const parsed = JSON.parse(result)

    expect(parsed.success).toBe(true)
    expect(parsed.lead.name).toBe('Jane Doe')
    expect(mockPrisma.lead.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane@test.com',
          organizationId: 'org-1',
        }),
      }),
    )
  })

  it('create_lead validates required fields', async () => {
    const result = await service.executeFunction(
      'create_lead',
      { firstName: 'Jane' },
      'org-1',
      'user-1',
      'ADMIN',
    )
    const parsed = JSON.parse(result)
    expect(parsed.error).toBeDefined()
  })

  it('search_leads returns matching leads', async () => {
    mockPrisma.lead.findMany.mockResolvedValue([
      { id: 'l1', firstName: 'John', lastName: 'Doe', email: 'john@test.com', status: 'NEW', score: 80 },
    ] as any)
    mockPrisma.lead.count.mockResolvedValue(1)

    const result = await service.executeFunction(
      'search_leads',
      { query: 'john' },
      'org-1',
      'user-1',
      'ADMIN',
    )
    const parsed = JSON.parse(result)

    expect(parsed.leads).toBeDefined()
    expect(parsed.leads.length).toBe(1)
  })

  it('get_lead_count returns count', async () => {
    mockPrisma.lead.count.mockResolvedValue(42)

    const result = await service.executeFunction(
      'get_lead_count',
      {},
      'org-1',
      'user-1',
      'ADMIN',
    )
    const parsed = JSON.parse(result)
    expect(parsed.count).toBe(42)
  })

  it('get_lead_details returns lead info', async () => {
    mockPrisma.lead.findFirst.mockResolvedValue({
      id: 'lead-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@test.com',
      phone: '555-0100',
      status: 'QUALIFIED',
      score: 85,
      source: 'Website',
      notes: [],
      tags: [],
      activities: [],
    } as any)

    const result = await service.executeFunction(
      'get_lead_details',
      { leadId: 'lead-1' },
      'org-1',
      'user-1',
      'ADMIN',
    )
    const parsed = JSON.parse(result)
    expect(parsed.lead).toBeDefined()
    expect(parsed.lead.firstName).toBe('John')
  })
})

// ───────────────────────────────────────────
// 4. TASK OPERATIONS
// ───────────────────────────────────────────
describe('executeFunction – task operations', () => {
  it('create_task creates a task', async () => {
    mockPrisma.lead.findFirst.mockResolvedValue({
      id: 'lead-1', firstName: 'John', lastName: 'Doe', organizationId: 'org-1',
    } as any)
    mockPrisma.task.create.mockResolvedValue({
      id: 'task-1',
      title: 'Follow up',
      description: 'Call back',
      priority: 'HIGH',
      status: 'PENDING',
      dueDate: new Date(),
    } as any)

    const result = await service.executeFunction(
      'create_task',
      { title: 'Follow up', description: 'Call back', priority: 'HIGH', leadId: 'lead-1' },
      'org-1',
      'user-1',
      'ADMIN',
    )
    const parsed = JSON.parse(result)
    expect(parsed.success).toBe(true)
    expect(mockPrisma.task.create).toHaveBeenCalled()
  })

  it('complete_task marks task as done', async () => {
    mockPrisma.task.findFirst.mockResolvedValue({
      id: 'task-1',
      title: 'Follow up',
      status: 'PENDING',
      organizationId: 'org-1',
    } as any)
    mockPrisma.task.update.mockResolvedValue({
      id: 'task-1',
      title: 'Follow up',
      status: 'COMPLETED',
    } as any)

    const result = await service.executeFunction(
      'complete_task',
      { taskId: 'task-1' },
      'org-1',
      'user-1',
      'ADMIN',
    )
    const parsed = JSON.parse(result)
    expect(parsed.success).toBe(true)
  })

  it('list_tasks returns tasks for the user', async () => {
    mockPrisma.task.findMany.mockResolvedValue([
      { id: 't1', title: 'Task A', status: 'PENDING', priority: 'HIGH', dueDate: new Date() },
    ] as any)

    const result = await service.executeFunction(
      'list_tasks',
      {},
      'org-1',
      'user-1',
      'ADMIN',
    )
    const parsed = JSON.parse(result)
    expect(parsed.tasks).toBeDefined()
  })
})

// ───────────────────────────────────────────
// 5. DASHBOARD & ANALYTICS
// ───────────────────────────────────────────
describe('executeFunction – analytics', () => {
  it('get_dashboard_stats returns stats', async () => {
    mockPrisma.lead.count.mockResolvedValue(100)
    mockPrisma.activity.count.mockResolvedValue(50)
    mockPrisma.task.count.mockResolvedValue(20)
    mockPrisma.campaign.count.mockResolvedValue(5)
    mockPrisma.lead.groupBy.mockResolvedValue([
      { status: 'NEW', _count: { _all: 30 } },
      { status: 'CONTACTED', _count: { _all: 40 } },
    ] as any)

    const result = await service.executeFunction(
      'get_dashboard_stats',
      {},
      'org-1',
      'user-1',
      'ADMIN',
    )
    const parsed = JSON.parse(result)
    expect(parsed.stats).toBeDefined()
  })

  it('get_lead_analytics returns analytics data', async () => {
    mockPrisma.lead.groupBy.mockResolvedValue([
      { status: 'NEW', _count: { _all: 10 } },
    ] as any)
    mockPrisma.lead.count.mockResolvedValue(50)
    mockPrisma.lead.findMany.mockResolvedValue([])

    const result = await service.executeFunction(
      'get_lead_analytics',
      {},
      'org-1',
      'user-1',
      'ADMIN',
    )
    const parsed = JSON.parse(result)
    expect(parsed).toBeDefined()
  })
})

// ───────────────────────────────────────────
// 6. UNKNOWN FUNCTION
// ───────────────────────────────────────────
describe('executeFunction – unknown function', () => {
  it('returns error for unknown function name', async () => {
    const result = await service.executeFunction(
      'nonexistent_function',
      {},
      'org-1',
      'user-1',
      'ADMIN',
    )
    const parsed = JSON.parse(result)
    expect(parsed.error).toContain('Unknown function')
  })
})

// ───────────────────────────────────────────
// 7. HELPER METHOD TESTS
// ───────────────────────────────────────────
describe('AIFunctionsService helpers', () => {
  it('isDestructiveFunction returns true for destructive functions', () => {
    expect(service.isDestructiveFunction('delete_lead')).toBe(true)
    expect(service.isDestructiveFunction('send_email')).toBe(true)
    expect(service.isDestructiveFunction('bulk_delete_leads')).toBe(true)
  })

  it('isDestructiveFunction returns false for non-destructive functions', () => {
    expect(service.isDestructiveFunction('search_leads')).toBe(false)
    expect(service.isDestructiveFunction('get_lead_count')).toBe(false)
    expect(service.isDestructiveFunction('create_lead')).toBe(false)
  })

  it('isAdminOnlyFunction returns true for admin functions', () => {
    expect(service.isAdminOnlyFunction('delete_lead')).toBe(true)
    expect(service.isAdminOnlyFunction('bulk_delete_leads')).toBe(true)
  })

  it('isAdminOnlyFunction returns false for non-admin functions', () => {
    expect(service.isAdminOnlyFunction('create_lead')).toBe(false)
    expect(service.isAdminOnlyFunction('search_leads')).toBe(false)
  })
})

// ───────────────────────────────────────────
// 8. NOTIFICATION OPERATIONS
// ───────────────────────────────────────────
describe('executeFunction – notifications', () => {
  it('get_notifications returns user notifications', async () => {
    mockPrisma.notification.findMany.mockResolvedValue([
      { id: 'n1', title: 'New lead', message: 'A new lead was created', read: false, createdAt: new Date() },
    ] as any)

    const result = await service.executeFunction(
      'get_notifications',
      {},
      'org-1',
      'user-1',
      'ADMIN',
    )
    const parsed = JSON.parse(result)
    expect(parsed.notifications).toBeDefined()
  })

  it('get_unread_notification_count returns count', async () => {
    mockPrisma.notification.count.mockResolvedValue(3)

    const result = await service.executeFunction(
      'get_unread_notification_count',
      {},
      'org-1',
      'user-1',
      'ADMIN',
    )
    const parsed = JSON.parse(result)
    expect(parsed.unreadCount).toBe(3)
  })

  it('mark_notifications_read marks all as read', async () => {
    mockPrisma.notification.updateMany.mockResolvedValue({ count: 5 })

    const result = await service.executeFunction(
      'mark_notifications_read',
      {},
      'org-1',
      'user-1',
      'ADMIN',
    )
    const parsed = JSON.parse(result)
    expect(parsed.success).toBe(true)
  })
})

// ───────────────────────────────────────────
// 9. CAMPAIGN OPERATIONS
// ───────────────────────────────────────────
describe('executeFunction – campaigns', () => {
  it('list_campaigns returns campaigns', async () => {
    mockPrisma.campaign.findMany.mockResolvedValue([
      { id: 'c1', name: 'Spring Sale', status: 'ACTIVE', type: 'EMAIL' },
    ] as any)

    const result = await service.executeFunction(
      'list_campaigns',
      {},
      'org-1',
      'user-1',
      'ADMIN',
    )
    const parsed = JSON.parse(result)
    expect(parsed.campaigns).toBeDefined()
  })

  it('create_campaign creates a campaign', async () => {
    mockPrisma.campaign.create.mockResolvedValue({
      id: 'c1',
      name: 'Test Campaign',
      type: 'EMAIL',
      status: 'DRAFT',
    } as any)

    const result = await service.executeFunction(
      'create_campaign',
      { name: 'Test Campaign', type: 'EMAIL', content: 'Campaign body' },
      'org-1',
      'user-1',
      'ADMIN',
    )
    const parsed = JSON.parse(result)
    expect(parsed.success).toBe(true)
  })
})

// ───────────────────────────────────────────
// 10. SAFETY: arg sanitization
// ───────────────────────────────────────────
describe('executeFunction – argument sanitization', () => {
  it('sanitizes HTML/script tags from arguments', async () => {
    mockPrisma.lead.create.mockResolvedValue({
      id: 'lead-1',
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@test.com',
      phone: null,
      status: 'NEW',
      score: 50,
    } as any)

    // Inject script tag in firstName
    await service.executeFunction(
      'create_lead',
      {
        firstName: '<script>alert("xss")</script>Jane',
        lastName: 'Doe',
        email: 'jane@test.com',
      },
      'org-1',
      'user-1',
      'ADMIN',
    )

    // Verify the create call received sanitized data
    const createCall = mockPrisma.lead.create.mock.calls[0][0]
    expect(createCall.data.firstName).not.toContain('<script>')
  })
})
