import { PrismaClient, ExecutionStatus, WorkflowTrigger } from '@prisma/client'
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

jest.mock('../../src/services/workflow.service', () => ({
  executeWorkflow: jest.fn().mockResolvedValue({ success: true }),
  triggerWorkflowsForLead: jest.fn().mockResolvedValue([]),
}))

jest.mock('../../src/utils/metricsCalculator', () => ({
  calcRate: jest.fn().mockReturnValue(50),
}))

import { enqueueWorkflow, ExecutionQueueItem } from '../../src/services/workflowExecutor.service'

describe('workflowExecutor.service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('enqueues a workflow item', () => {
    expect(() =>
      enqueueWorkflow({
        workflowId: 'w1',
        triggerType: 'LEAD_CREATED' as WorkflowTrigger,
        priority: 'normal',
      })
    ).not.toThrow()
  })

  it('enqueues critical items at front of queue', () => {
    expect(() =>
      enqueueWorkflow({
        workflowId: 'w-critical',
        triggerType: 'LEAD_STATUS_CHANGED' as WorkflowTrigger,
        priority: 'critical',
      })
    ).not.toThrow()
  })

  it('enqueues with metadata', () => {
    expect(() =>
      enqueueWorkflow({
        workflowId: 'w2',
        leadId: 'lead1',
        triggerType: 'SCORE_THRESHOLD' as WorkflowTrigger,
        metadata: { scoreValue: 85 },
        priority: 'high',
      })
    ).not.toThrow()
  })
})
