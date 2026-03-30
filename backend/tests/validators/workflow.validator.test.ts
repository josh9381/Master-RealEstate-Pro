import {
  createWorkflowSchema,
  updateWorkflowSchema,
  toggleWorkflowSchema,
  testWorkflowSchema,
  workflowQuerySchema,
} from '../../src/validators/workflow.validator'

describe('workflow.validator', () => {
  describe('createWorkflowSchema', () => {
    const valid = {
      name: 'Welcome Flow',
      triggerType: 'LEAD_CREATED',
      actions: [{ type: 'SEND_EMAIL', config: {} }],
    }

    it('accepts valid workflow', () => {
      expect(createWorkflowSchema.safeParse(valid).success).toBe(true)
    })

    it('rejects missing name', () => {
      expect(createWorkflowSchema.safeParse({ triggerType: 'LEAD_CREATED', actions: [{}] }).success).toBe(false)
    })

    it('rejects invalid triggerType', () => {
      expect(createWorkflowSchema.safeParse({ ...valid, triggerType: 'INVALID' }).success).toBe(false)
    })

    it('accepts all trigger types', () => {
      const types = [
        'LEAD_CREATED', 'LEAD_STATUS_CHANGED', 'LEAD_ASSIGNED',
        'CAMPAIGN_COMPLETED', 'EMAIL_OPENED', 'TIME_BASED',
        'SCORE_THRESHOLD', 'TAG_ADDED', 'MANUAL', 'WEBHOOK',
      ]
      types.forEach((triggerType) => {
        expect(createWorkflowSchema.safeParse({ ...valid, triggerType }).success).toBe(true)
      })
    })

    it('rejects empty actions array', () => {
      expect(createWorkflowSchema.safeParse({ name: 'X', triggerType: 'LEAD_CREATED', actions: [] }).success).toBe(false)
    })

    it('accepts maxRetries in range', () => {
      expect(createWorkflowSchema.safeParse({ ...valid, maxRetries: 3 }).success).toBe(true)
    })

    it('rejects maxRetries over 3', () => {
      expect(createWorkflowSchema.safeParse({ ...valid, maxRetries: 4 }).success).toBe(false)
    })

    it('accepts nodes with position', () => {
      expect(createWorkflowSchema.safeParse({
        ...valid,
        nodes: [{ id: '1', type: 'trigger', label: 'Start', position: { x: 0, y: 0 } }],
      }).success).toBe(true)
    })

    it('rejects invalid node type', () => {
      expect(createWorkflowSchema.safeParse({
        ...valid,
        nodes: [{ id: '1', type: 'invalid', label: 'X' }],
      }).success).toBe(false)
    })
  })

  describe('updateWorkflowSchema', () => {
    it('accepts partial update', () => {
      expect(updateWorkflowSchema.safeParse({ name: 'Updated' }).success).toBe(true)
    })

    it('accepts isActive toggle', () => {
      expect(updateWorkflowSchema.safeParse({ isActive: true }).success).toBe(true)
    })
  })

  describe('toggleWorkflowSchema', () => {
    it('accepts boolean', () => {
      expect(toggleWorkflowSchema.safeParse({ isActive: true }).success).toBe(true)
      expect(toggleWorkflowSchema.safeParse({ isActive: false }).success).toBe(true)
    })

    it('rejects missing isActive', () => {
      expect(toggleWorkflowSchema.safeParse({}).success).toBe(false)
    })
  })

  describe('testWorkflowSchema', () => {
    it('accepts empty object', () => {
      expect(testWorkflowSchema.safeParse({}).success).toBe(true)
    })

    it('accepts testData', () => {
      expect(testWorkflowSchema.safeParse({ testData: { leadId: 'abc' } }).success).toBe(true)
    })
  })

  describe('workflowQuerySchema', () => {
    it('accepts empty query', () => {
      expect(workflowQuerySchema.safeParse({}).success).toBe(true)
    })

    it('accepts isActive filter', () => {
      expect(workflowQuerySchema.safeParse({ isActive: 'true' }).success).toBe(true)
    })

    it('accepts triggerType filter', () => {
      expect(workflowQuerySchema.safeParse({ triggerType: 'MANUAL' }).success).toBe(true)
    })
  })
})
