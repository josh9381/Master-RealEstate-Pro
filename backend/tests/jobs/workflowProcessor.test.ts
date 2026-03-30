jest.mock('../../src/lib/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }))
jest.mock('../../src/utils/distributedLock', () => ({
  acquireLock: jest.fn().mockResolvedValue(true),
  releaseLock: jest.fn().mockResolvedValue(undefined),
}))
jest.mock('../../src/services/workflowExecutor.service', () => ({
  processTimeBasedWorkflows: jest.fn().mockResolvedValue(undefined),
  getQueueStatus: jest.fn().mockReturnValue({
    queueSize: 0,
    isProcessing: false,
    breakdown: { critical: 0, high: 0, normal: 0, low: 0 },
  }),
  getExecutionStats: jest.fn().mockReturnValue({
    totalExecuted: 100,
    successRate: 95,
    averageDuration: 250,
  }),
}))
jest.mock('../../src/services/workflow.service', () => ({
  recoverDelayedWorkflowActions: jest.fn().mockResolvedValue(0),
}))

describe('workflowProcessor job', () => {
  it('module loads without errors', async () => {
    const mod = await import('../../src/jobs/workflowProcessor')
    expect(mod).toBeDefined()
  })

  it('exports start and stop functions', async () => {
    const mod = await import('../../src/jobs/workflowProcessor')
    expect(typeof mod.startWorkflowJobs).toBe('function')
    expect(typeof mod.stopWorkflowJobs).toBe('function')
  })

  it('starts and stops without errors', async () => {
    const mod = await import('../../src/jobs/workflowProcessor')
    mod.startWorkflowJobs()
    mod.stopWorkflowJobs()
  })
})
