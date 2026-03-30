import { PrismaClient } from '@prisma/client'
import { mockDeep } from 'jest-mock-extended'

const mockPrisma = mockDeep<PrismaClient>()

jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: mockPrisma,
  prisma: mockPrisma,
}))

jest.mock('../../src/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }
}))

jest.mock('../../src/services/email.service', () => ({
  sendEmail: jest.fn().mockResolvedValue({ success: true }),
}))

jest.mock('../../src/services/sms.service', () => ({
  sendSMS: jest.fn().mockResolvedValue({ success: true }),
}))

jest.mock('../../src/config/socket', () => ({
  pushWorkflowEvent: jest.fn(),
  pushNotification: jest.fn(),
}))

jest.mock('../../src/utils/metricsCalculator', () => ({
  calcRate: jest.fn().mockReturnValue(50),
}))

jest.mock('../../src/services/segmentation.service', () => ({
  getSegmentMembers: jest.fn().mockResolvedValue([]),
}))

import {
  getWorkflows,
  getWorkflowById,
  createWorkflow,
  WorkflowCondition,
} from '../../src/services/workflow.service'

describe('workflow.service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getWorkflows', () => {
    it('returns workflows list', async () => {
      mockPrisma.workflow.findMany.mockResolvedValue([
        { id: 'w1', name: 'Auto Assign', isActive: true, triggerType: 'LEAD_CREATED', _count: { workflowExecutions: 5 } },
        { id: 'w2', name: 'Follow Up', isActive: false, triggerType: 'LEAD_STATUS_CHANGED', _count: { workflowExecutions: 0 } },
      ] as any)

      const results = await getWorkflows()
      expect(results).toHaveLength(2)
    })

    it('filters by isActive', async () => {
      mockPrisma.workflow.findMany.mockResolvedValue([])
      await getWorkflows({ isActive: true })
      expect(mockPrisma.workflow.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
        })
      )
    })

    it('filters by search term', async () => {
      mockPrisma.workflow.findMany.mockResolvedValue([])
      await getWorkflows({ search: 'follow' })
      expect(mockPrisma.workflow.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ name: expect.objectContaining({ contains: 'follow' }) }),
            ]),
          }),
        })
      )
    })
  })

  describe('getWorkflowById', () => {
    it('returns workflow with executions', async () => {
      mockPrisma.workflow.findUnique.mockResolvedValue({
        id: 'w1',
        name: 'Test Workflow',
        workflowExecutions: [],
      } as any)

      const result = await getWorkflowById('w1')
      expect(result.id).toBe('w1')
    })

    it('throws when workflow not found', async () => {
      mockPrisma.workflow.findUnique.mockResolvedValue(null)
      await expect(getWorkflowById('bad-id')).rejects.toThrow(/not found/i)
    })
  })

  describe('createWorkflow', () => {
    it('creates a workflow with actions', async () => {
      mockPrisma.workflow.create.mockResolvedValue({
        id: 'w1',
        name: 'New Workflow',
        triggerType: 'LEAD_CREATED',
        isActive: true,
      } as any)

      const result = await createWorkflow({
        name: 'New Workflow',
        triggerType: 'LEAD_CREATED' as any,
        actions: [{ type: 'SEND_EMAIL', config: { template: 'welcome' } }],
        organizationId: 'org1',
      })
      expect(result).toHaveProperty('id')
    })

    it('throws when no actions provided', async () => {
      await expect(
        createWorkflow({
          name: 'No Actions',
          triggerType: 'LEAD_CREATED' as any,
          actions: [],
          organizationId: 'org1',
        })
      ).rejects.toThrow(/action/i)
    })
  })
})
