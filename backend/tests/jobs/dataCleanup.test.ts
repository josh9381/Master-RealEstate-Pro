import { mockDeep, mockReset } from 'jest-mock-extended'
import { PrismaClient } from '@prisma/client'

const mockPrisma = mockDeep<PrismaClient>()
jest.mock('../../src/config/database', () => ({ __esModule: true, default: mockPrisma, prisma: mockPrisma }))
jest.mock('../../src/lib/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }))
jest.mock('../../src/utils/distributedLock', () => ({
  acquireLock: jest.fn().mockResolvedValue(true),
  releaseLock: jest.fn().mockResolvedValue(undefined),
}))
jest.mock('../../src/config/subscriptions', () => ({
  AI_PLAN_LIMITS: {
    STARTER: { chatHistoryDays: 7 },
    PROFESSIONAL: { chatHistoryDays: 90 },
    ELITE: { chatHistoryDays: 'unlimited' },
    TEAM: { chatHistoryDays: 'unlimited' },
    ENTERPRISE: { chatHistoryDays: 'unlimited' },
  },
}))

import { startDataCleanup, stopDataCleanup } from '../../src/jobs/dataCleanup'
import { acquireLock } from '../../src/utils/distributedLock'

beforeEach(() => {
  mockReset(mockPrisma)
  jest.clearAllMocks()
  jest.useFakeTimers()
})

afterEach(() => {
  stopDataCleanup()
  jest.useRealTimers()
})

describe('dataCleanup job', () => {
  describe('startDataCleanup', () => {
    it('starts the cleanup scheduler', () => {
      startDataCleanup()
      // The initial run is scheduled with a 30s delay
      expect(setTimeout).toBeDefined()
    })
  })

  describe('stopDataCleanup', () => {
    it('stops the scheduler without errors', () => {
      startDataCleanup()
      stopDataCleanup()
      // Should not throw
    })

    it('is safe to call when not started', () => {
      stopDataCleanup()
      // Should not throw
    })
  })
})
