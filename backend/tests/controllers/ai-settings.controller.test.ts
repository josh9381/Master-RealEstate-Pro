import { mockDeep, mockReset } from 'jest-mock-extended'
import type { PrismaClient } from '@prisma/client'
import { Request, Response } from 'express'

const mockPrisma = mockDeep<PrismaClient>()
jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: mockPrisma,
  prisma: mockPrisma,
}))

jest.mock('../../src/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}))

jest.mock('../../src/services/user-preferences.service', () => ({
  getFullAIPreferences: jest.fn(),
  saveAllAIPreferences: jest.fn(),
  resetComposerPreferences: jest.fn(),
}))

jest.mock('../../src/services/usage-tracking.service', () => ({
  getUsageWithLimits: jest.fn(),
  getCostBreakdown: jest.fn(),
}))

jest.mock('../../src/services/ai-config.service', () => ({
  getOrgAISettings: jest.fn(),
  updateOrgAISettings: jest.fn(),
  MODEL_PRICING: {
    'gpt-4o': { input: 0.000005, output: 0.000015 },
    'gpt-4o-mini': { input: 0.00000015, output: 0.0000006 },
  },
  MODEL_TIERS: { standard: 'gpt-4o-mini', premium: 'gpt-4o' },
}))

jest.mock('../../src/controllers/ai-scoring.controller', () => ({
  recalibrationJobs: new Map(),
}))

jest.mock('../../src/routes/ai.routes', () => ({
  invalidateTierCache: jest.fn(),
}))

jest.mock('../../src/utils/metricsCalculator', () => ({
  calcRate: jest.fn((a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0)),
  calcPercentChange: jest.fn((curr: number, prev: number) => (prev === 0 ? (curr > 0 ? 100 : 0) : Math.round(((curr - prev) / prev) * 100))),
  roundTo2: jest.fn((n: number) => Math.round(n * 100) / 100),
}))

import * as preferencesService from '../../src/services/user-preferences.service'
import { getUsageWithLimits, getCostBreakdown } from '../../src/services/usage-tracking.service'
import { getOrgAISettings, updateOrgAISettings } from '../../src/services/ai-config.service'
import { invalidateTierCache } from '../../src/routes/ai.routes'
import {
  getAIStats,
  getAIFeatures,
  getAIUsage,
  getAIUsageLimits,
  getPreferences,
  savePreferences,
  resetPreferences,
  getOrgSettings,
  updateOrgSettings,
  getAvailableModels,
  getCostDashboard,
  submitChatFeedback,
  submitInsightFeedback,
  getFeedbackStats,
  getBudgetSettings,
  updateBudgetSettings,
} from '../../src/controllers/ai-settings.controller'

function mockReqRes(body = {}, params = {}, query = {}, user: any = { userId: 'u1', organizationId: 'org1', role: 'ADMIN' }) {
  const req = { body, params, query, user, ip: '127.0.0.1', headers: {} } as unknown as Request
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as unknown as Response
  return { req, res }
}

describe('ai-settings.controller', () => {
  beforeEach(() => {
    mockReset(mockPrisma)
    jest.clearAllMocks()
  })

  // ── getAIStats ──────────────────────────────────────────────────
  describe('getAIStats', () => {
    it('returns AI statistics on success', async () => {
      ;(mockPrisma.lead.count as jest.Mock).mockResolvedValue(50)
      ;(mockPrisma.leadScoringModel.count as jest.Mock).mockResolvedValue(2)
      ;(mockPrisma.leadScoringModel.aggregate as jest.Mock).mockResolvedValue({ _avg: { accuracy: 85.5 }, _count: { id: 1 } })
      ;(mockPrisma.modelPerformanceHistory.findMany as jest.Mock).mockResolvedValue([{ accuracyAfter: 90, accuracyBefore: 85 }])
      ;(mockPrisma.chatMessage.count as jest.Mock).mockResolvedValue(10)
      ;(mockPrisma.aIInsight.count as jest.Mock).mockResolvedValue(5)
      ;(mockPrisma.chatMessage.aggregate as jest.Mock).mockResolvedValue({ _sum: { tokens: 5000, cost: 0.50 } })

      const { req, res } = mockReqRes()
      await getAIStats(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          leadsScored: 50,
          activeModels: 2,
        }),
      }))
    })

    it('returns 500 on error', async () => {
      ;(mockPrisma.lead.count as jest.Mock).mockRejectedValue(new Error('DB error'))

      const { req, res } = mockReqRes()
      await getAIStats(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }))
    })
  })

  // ── getAIFeatures ───────────────────────────────────────────────
  describe('getAIFeatures', () => {
    it('returns feature list with AI enabled when OPENAI_API_KEY is set', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      ;(mockPrisma.lead.count as jest.Mock).mockResolvedValue(10)
      ;(mockPrisma.leadScoringModel.count as jest.Mock).mockResolvedValue(1)
      ;(mockPrisma.aBTest.count as jest.Mock).mockResolvedValue(0)
      ;(mockPrisma.aIInsight.count as jest.Mock).mockResolvedValue(3)
      ;(mockPrisma.organization.findUnique as jest.Mock).mockResolvedValue({ useOwnAIKey: false, openaiApiKey: null })

      const { req, res } = mockReqRes()
      await getAIFeatures(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({ id: 'lead-scoring', status: 'active' }),
          expect.objectContaining({ id: 'ai-chatbot', status: 'active' }),
        ]),
      }))
      delete process.env.OPENAI_API_KEY
    })

    it('returns 500 on error', async () => {
      ;(mockPrisma.lead.count as jest.Mock).mockRejectedValue(new Error('fail'))
      const { req, res } = mockReqRes()
      await getAIFeatures(req, res)
      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  // ── getAIUsage ──────────────────────────────────────────────────
  describe('getAIUsage', () => {
    it('returns usage data', async () => {
      ;(mockPrisma.chatMessage.aggregate as jest.Mock).mockResolvedValue({
        _sum: { tokens: 1000, cost: 0.10 },
        _count: { id: 5 },
      })
      ;(getUsageWithLimits as jest.Mock).mockResolvedValue({ usage: { totalTokensUsed: 1000 }, tier: 'PROFESSIONAL' })

      const { req, res } = mockReqRes({}, {}, { startDate: '2025-01-01' })
      await getAIUsage(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          chat: expect.objectContaining({ totalMessages: 5 }),
        }),
      }))
    })

    it('returns 500 on error', async () => {
      ;(mockPrisma.chatMessage.aggregate as jest.Mock).mockRejectedValue(new Error('fail'))
      const { req, res } = mockReqRes()
      await getAIUsage(req, res)
      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  // ── getAIUsageLimits ────────────────────────────────────────────
  describe('getAIUsageLimits', () => {
    it('returns usage limits with cost history', async () => {
      ;(getUsageWithLimits as jest.Mock).mockResolvedValue({ usage: {}, tier: 'STARTER' })
      ;(getCostBreakdown as jest.Mock).mockResolvedValue([{ month: '2025-01', cost: 5 }])

      const { req, res } = mockReqRes()
      await getAIUsageLimits(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({ costHistory: expect.any(Array) }),
      }))
    })

    it('returns 500 on error', async () => {
      ;(getUsageWithLimits as jest.Mock).mockRejectedValue(new Error('fail'))
      const { req, res } = mockReqRes()
      await getAIUsageLimits(req, res)
      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  // ── getPreferences ──────────────────────────────────────────────
  describe('getPreferences', () => {
    it('returns user preferences', async () => {
      ;(preferencesService.getFullAIPreferences as jest.Mock).mockResolvedValue({ defaultTone: 'professional' })

      const { req, res } = mockReqRes()
      await getPreferences(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: { defaultTone: 'professional' },
      }))
    })

    it('returns 500 on error', async () => {
      ;(preferencesService.getFullAIPreferences as jest.Mock).mockRejectedValue(new Error('fail'))
      const { req, res } = mockReqRes()
      await getPreferences(req, res)
      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  // ── savePreferences ─────────────────────────────────────────────
  describe('savePreferences', () => {
    it('saves structured preferences', async () => {
      ;(preferencesService.saveAllAIPreferences as jest.Mock).mockResolvedValue({ composer: { tone: 'casual' } })

      const { req, res } = mockReqRes({ composer: { tone: 'casual' } })
      await savePreferences(req, res)

      expect(preferencesService.saveAllAIPreferences).toHaveBeenCalledWith('u1', { composer: { tone: 'casual' } }, 'org1')
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })

    it('wraps legacy flat format into composer', async () => {
      ;(preferencesService.saveAllAIPreferences as jest.Mock).mockResolvedValue({})

      const { req, res } = mockReqRes({ defaultTone: 'friendly' })
      await savePreferences(req, res)

      expect(preferencesService.saveAllAIPreferences).toHaveBeenCalledWith('u1', { composer: { defaultTone: 'friendly' } }, 'org1')
    })

    it('returns 500 on error', async () => {
      ;(preferencesService.saveAllAIPreferences as jest.Mock).mockRejectedValue(new Error('fail'))
      const { req, res } = mockReqRes({})
      await savePreferences(req, res)
      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  // ── resetPreferences ────────────────────────────────────────────
  describe('resetPreferences', () => {
    it('resets and returns defaults', async () => {
      ;(preferencesService.resetComposerPreferences as jest.Mock).mockResolvedValue(undefined)
      ;(preferencesService.getFullAIPreferences as jest.Mock).mockResolvedValue({ defaultTone: 'professional' })

      const { req, res } = mockReqRes()
      await resetPreferences(req, res)

      expect(preferencesService.resetComposerPreferences).toHaveBeenCalledWith('u1')
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })

    it('returns 500 on error', async () => {
      ;(preferencesService.resetComposerPreferences as jest.Mock).mockRejectedValue(new Error('fail'))
      const { req, res } = mockReqRes()
      await resetPreferences(req, res)
      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  // ── getOrgSettings ──────────────────────────────────────────────
  describe('getOrgSettings', () => {
    it('returns org AI settings', async () => {
      ;(getOrgAISettings as jest.Mock).mockResolvedValue({ model: 'gpt-4o' })

      const { req, res } = mockReqRes()
      await getOrgSettings(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: { model: 'gpt-4o' },
      }))
    })

    it('returns 500 on error', async () => {
      ;(getOrgAISettings as jest.Mock).mockRejectedValue(new Error('fail'))
      const { req, res } = mockReqRes()
      await getOrgSettings(req, res)
      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  // ── updateOrgSettings ───────────────────────────────────────────
  describe('updateOrgSettings', () => {
    it('updates org settings and invalidates tier cache', async () => {
      ;(updateOrgAISettings as jest.Mock).mockResolvedValue({ model: 'gpt-4o-mini' })

      const { req, res } = mockReqRes({ model: 'gpt-4o-mini' })
      await updateOrgSettings(req, res)

      expect(invalidateTierCache).toHaveBeenCalledWith('org1')
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })

    it('returns 500 on error', async () => {
      ;(updateOrgAISettings as jest.Mock).mockRejectedValue(new Error('fail'))
      const { req, res } = mockReqRes({})
      await updateOrgSettings(req, res)
      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  // ── getAvailableModels ──────────────────────────────────────────
  describe('getAvailableModels', () => {
    it('returns model list with pricing', async () => {
      const { req, res } = mockReqRes()
      await getAvailableModels(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({ model: 'gpt-4o' }),
        ]),
      }))
    })
  })

  // ── getCostDashboard ────────────────────────────────────────────
  describe('getCostDashboard', () => {
    it('returns cost dashboard data', async () => {
      ;(getCostBreakdown as jest.Mock).mockResolvedValue([])
      ;(getUsageWithLimits as jest.Mock).mockResolvedValue({ usage: { totalCost: 10, totalTokensUsed: 5000 }, tier: 'PRO', useOwnKey: false })
      ;(mockPrisma.chatMessage.groupBy as jest.Mock).mockResolvedValue([])
      ;(mockPrisma.user.findMany as jest.Mock).mockResolvedValue([])
      ;(mockPrisma.organization.findUnique as jest.Mock).mockResolvedValue({
        aiBudgetWarning: 25, aiBudgetCaution: 50, aiBudgetHardLimit: 100, aiBudgetAlertEnabled: true,
      })

      const { req, res } = mockReqRes({}, {}, { months: '3' })
      await getCostDashboard(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          budget: expect.objectContaining({ status: 'ok' }),
        }),
      }))
    })

    it('returns 500 on error', async () => {
      ;(getCostBreakdown as jest.Mock).mockRejectedValue(new Error('fail'))
      const { req, res } = mockReqRes()
      await getCostDashboard(req, res)
      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  // ── submitChatFeedback ──────────────────────────────────────────
  describe('submitChatFeedback', () => {
    it('submits positive feedback', async () => {
      ;(mockPrisma.chatMessage.findFirst as jest.Mock).mockResolvedValue({ id: 'msg1' })
      ;(mockPrisma.chatMessage.update as jest.Mock).mockResolvedValue({ id: 'msg1', feedback: 'positive' })

      const { req, res } = mockReqRes({ feedback: 'positive' }, { id: 'msg1' })
      await submitChatFeedback(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({ feedback: 'positive' }),
      }))
    })

    it('returns 404 if message not found', async () => {
      ;(mockPrisma.chatMessage.findFirst as jest.Mock).mockResolvedValue(null)

      const { req, res } = mockReqRes({ feedback: 'positive' }, { id: 'msg-missing' })
      await submitChatFeedback(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('returns 500 on error', async () => {
      ;(mockPrisma.chatMessage.findFirst as jest.Mock).mockRejectedValue(new Error('fail'))
      const { req, res } = mockReqRes({ feedback: 'positive' }, { id: 'msg1' })
      await submitChatFeedback(req, res)
      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  // ── submitInsightFeedback ───────────────────────────────────────
  describe('submitInsightFeedback', () => {
    it('submits insight feedback', async () => {
      ;(mockPrisma.aIInsight.findFirst as jest.Mock).mockResolvedValue({ id: 'ins1' })
      ;(mockPrisma.aIInsight.update as jest.Mock).mockResolvedValue({ id: 'ins1', feedback: 'helpful' })

      const { req, res } = mockReqRes({ feedback: 'helpful' }, { id: 'ins1' })
      await submitInsightFeedback(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({ feedback: 'helpful' }),
      }))
    })

    it('returns 404 if insight not found', async () => {
      ;(mockPrisma.aIInsight.findFirst as jest.Mock).mockResolvedValue(null)

      const { req, res } = mockReqRes({ feedback: 'helpful' }, { id: 'missing' })
      await submitInsightFeedback(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })
  })

  // ── getFeedbackStats ────────────────────────────────────────────
  describe('getFeedbackStats', () => {
    it('returns feedback statistics', async () => {
      ;(mockPrisma.chatMessage.count as jest.Mock).mockResolvedValue(10)
      ;(mockPrisma.aIInsight.count as jest.Mock).mockResolvedValue(5)

      const { req, res } = mockReqRes()
      await getFeedbackStats(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          chat: expect.objectContaining({ total: 10 }),
        }),
      }))
    })

    it('returns 500 on error', async () => {
      ;(mockPrisma.chatMessage.count as jest.Mock).mockRejectedValue(new Error('fail'))
      const { req, res } = mockReqRes()
      await getFeedbackStats(req, res)
      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  // ── getBudgetSettings ───────────────────────────────────────────
  describe('getBudgetSettings', () => {
    it('returns budget settings', async () => {
      ;(mockPrisma.organization.findUnique as jest.Mock).mockResolvedValue({
        aiBudgetWarning: 30, aiBudgetCaution: 60, aiBudgetHardLimit: 120, aiBudgetAlertEnabled: true,
      })

      const { req, res } = mockReqRes()
      await getBudgetSettings(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({ warning: 30, hardLimit: 120 }),
      }))
    })

    it('returns defaults when org has no budget settings', async () => {
      ;(mockPrisma.organization.findUnique as jest.Mock).mockResolvedValue(null)

      const { req, res } = mockReqRes()
      await getBudgetSettings(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({ warning: 25, hardLimit: 100 }),
      }))
    })

    it('returns 500 on error', async () => {
      ;(mockPrisma.organization.findUnique as jest.Mock).mockRejectedValue(new Error('fail'))
      const { req, res } = mockReqRes()
      await getBudgetSettings(req, res)
      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  // ── updateBudgetSettings ────────────────────────────────────────
  describe('updateBudgetSettings', () => {
    it('updates budget settings', async () => {
      ;(mockPrisma.organization.update as jest.Mock).mockResolvedValue({
        aiBudgetWarning: 20, aiBudgetCaution: 40, aiBudgetHardLimit: 80, aiBudgetAlertEnabled: false,
      })

      const { req, res } = mockReqRes({ warning: 20, caution: 40, hardLimit: 80, alertEnabled: false })
      await updateBudgetSettings(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({ warning: 20, hardLimit: 80 }),
      }))
    })

    it('returns 500 on error', async () => {
      ;(mockPrisma.organization.update as jest.Mock).mockRejectedValue(new Error('fail'))
      const { req, res } = mockReqRes({ warning: 20 })
      await updateBudgetSettings(req, res)
      expect(res.status).toHaveBeenCalledWith(500)
    })
  })
})
