jest.mock('../../src/lib/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }))
jest.mock('../../src/config/database', () => ({ prisma: {} }))
jest.mock('../../src/services/workflow.service', () => ({ executeWorkflow: jest.fn() }))

import { WorkflowTriggerService } from '../../src/services/workflow-trigger.service'

describe('WorkflowTriggerService', () => {
  let service: WorkflowTriggerService

  beforeEach(() => {
    service = new WorkflowTriggerService()
  })

  describe('evaluateConditions', () => {
    const makeWorkflow = (conditions?: unknown[]) => ({
      id: 'wf1',
      name: 'Test Workflow',
      triggerData: conditions ? { conditions } : null,
    } as never)

    it('returns true when no triggerData (no conditions)', async () => {
      expect(await service.evaluateConditions(makeWorkflow(), {})).toBe(true)
    })

    it('returns true when triggerData has no conditions', async () => {
      expect(await service.evaluateConditions(makeWorkflow(undefined), {})).toBe(true)
    })

    it('evaluates equals condition: match', async () => {
      const wf = makeWorkflow([{ field: 'status', operator: 'equals', value: 'HOT' }])
      expect(await service.evaluateConditions(wf, { status: 'HOT' })).toBe(true)
    })

    it('evaluates equals condition: no match', async () => {
      const wf = makeWorkflow([{ field: 'status', operator: 'equals', value: 'HOT' }])
      expect(await service.evaluateConditions(wf, { status: 'COLD' })).toBe(false)
    })

    it('evaluates not_equals condition', async () => {
      const wf = makeWorkflow([{ field: 'status', operator: 'not_equals', value: 'COLD' }])
      expect(await service.evaluateConditions(wf, { status: 'HOT' })).toBe(true)
    })

    it('evaluates contains condition on string', async () => {
      const wf = makeWorkflow([{ field: 'email', operator: 'contains', value: 'gmail' }])
      expect(await service.evaluateConditions(wf, { email: 'user@gmail.com' })).toBe(true)
    })

    it('evaluates not_contains condition on string', async () => {
      const wf = makeWorkflow([{ field: 'email', operator: 'not_contains', value: 'spam' }])
      expect(await service.evaluateConditions(wf, { email: 'user@gmail.com' })).toBe(true)
    })

    it('evaluates greater_than condition', async () => {
      const wf = makeWorkflow([{ field: 'score', operator: 'greater_than', value: 50 }])
      expect(await service.evaluateConditions(wf, { score: 75 })).toBe(true)
      expect(await service.evaluateConditions(wf, { score: 40 })).toBe(false)
    })

    it('evaluates less_than condition', async () => {
      const wf = makeWorkflow([{ field: 'score', operator: 'less_than', value: 50 }])
      expect(await service.evaluateConditions(wf, { score: 30 })).toBe(true)
      expect(await service.evaluateConditions(wf, { score: 80 })).toBe(false)
    })

    it('evaluates exists condition', async () => {
      const wf = makeWorkflow([{ field: 'phone', operator: 'exists', value: null }])
      expect(await service.evaluateConditions(wf, { phone: '+15555555555' })).toBe(true)
      expect(await service.evaluateConditions(wf, { phone: null })).toBe(false)
    })

    it('evaluates nested field path with dot notation', async () => {
      const wf = makeWorkflow([{ field: 'lead.status', operator: 'equals', value: 'HOT' }])
      expect(await service.evaluateConditions(wf, { lead: { status: 'HOT' } })).toBe(true)
    })

    it('returns false when ALL conditions must match but one fails', async () => {
      const wf = makeWorkflow([
        { field: 'status', operator: 'equals', value: 'HOT' },
        { field: 'score', operator: 'greater_than', value: 80 },
      ])
      // score is only 60
      expect(await service.evaluateConditions(wf, { status: 'HOT', score: 60 })).toBe(false)
    })

    it('returns true when ALL conditions match', async () => {
      const wf = makeWorkflow([
        { field: 'status', operator: 'equals', value: 'HOT' },
        { field: 'score', operator: 'greater_than', value: 80 },
      ])
      expect(await service.evaluateConditions(wf, { status: 'HOT', score: 90 })).toBe(true)
    })
  })
})
