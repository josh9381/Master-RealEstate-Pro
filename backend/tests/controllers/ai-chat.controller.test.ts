import { mockDeep, mockReset } from 'jest-mock-extended'
import type { PrismaClient } from '@prisma/client'

const mockPrisma = mockDeep<PrismaClient>()
jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: mockPrisma,
  prisma: mockPrisma,
}))
jest.mock('../../src/services/intelligence.service', () => ({
  getIntelligenceService: jest.fn(() => ({
    enhanceMessage: jest.fn().mockResolvedValue('Enhanced message'),
    suggestActions: jest.fn().mockResolvedValue([{ action: 'call', reason: 'Follow up' }]),
  })),
}))
jest.mock('../../src/services/openai.service', () => ({
  getOpenAIService: jest.fn(() => ({
    chat: jest.fn().mockResolvedValue({ content: 'AI response', usage: { total_tokens: 50 } }),
  })),
  ASSISTANT_TONES: { professional: 'professional', friendly: 'friendly' },
}))
jest.mock('../../src/services/ai-functions.service', () => ({
  getAIFunctionsService: jest.fn(() => ({
    processToolCalls: jest.fn(),
  })),
  AI_FUNCTIONS: [],
  DESTRUCTIVE_FUNCTIONS: [],
  ADMIN_ONLY_FUNCTIONS: [],
}))
jest.mock('../../src/services/usage-tracking.service', () => ({
  incrementAIUsage: jest.fn(),
}))

import { getChatHistory, clearChatHistory } from '../../src/controllers/ai-chat.controller'

function mockReqRes(query = {}, body = {}, params = {}) {
  return {
    req: { query, body, params, user: { userId: 'u1', organizationId: 'org-1', role: 'ADMIN', email: 'a@test.com' }, ip: '127.0.0.1', headers: { 'user-agent': 'jest' } } as any,
    res: { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any,
  }
}

beforeEach(() => mockReset(mockPrisma))

describe('ai-chat.controller', () => {
  describe('getChatHistory', () => {
    it('returns chat history', async () => {
      const { req, res } = mockReqRes({ limit: '50' })
      mockPrisma.chatMessage.findMany.mockResolvedValue([
        { id: 'msg1', role: 'user', content: 'Hello', createdAt: new Date() },
      ] as any)

      await getChatHistory(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })

  describe('clearChatHistory', () => {
    it('clears chat history', async () => {
      const { req, res } = mockReqRes()
      mockPrisma.chatMessage.deleteMany.mockResolvedValue({ count: 5 })

      await clearChatHistory(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })
})
