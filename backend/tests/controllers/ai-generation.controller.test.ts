import { mockDeep, mockReset } from 'jest-mock-extended'
import type { PrismaClient } from '@prisma/client'

const mockPrisma = mockDeep<PrismaClient>()
jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: mockPrisma,
  prisma: mockPrisma,
}))

const mockOpenAIService = {
  generateEmailSequence: jest.fn().mockResolvedValue([{ subject: 'Hello', body: 'Hi there' }]),
  generateSMS: jest.fn().mockResolvedValue('Hey {{name}}, check out this property!'),
  generatePropertyDescription: jest.fn().mockResolvedValue('Beautiful 3-bedroom home...'),
  generateSocialPosts: jest.fn().mockResolvedValue([{ platform: 'facebook', content: 'Check this out!' }]),
}
jest.mock('../../src/services/openai.service', () => ({
  getOpenAIService: jest.fn(() => mockOpenAIService),
}))
jest.mock('../../src/services/message-context.service', () => ({
  gatherMessageContext: jest.fn().mockResolvedValue({}),
}))
jest.mock('../../src/services/ai-compose.service', () => ({
  generateContextualMessage: jest.fn().mockResolvedValue({ content: 'Hello', confidence: 0.9 }),
  generateVariations: jest.fn().mockResolvedValue([]),
}))
jest.mock('../../src/services/usage-tracking.service', () => ({
  incrementAIUsage: jest.fn(),
}))
jest.mock('../../src/services/ai-config.service', () => ({
  getAIConfigService: jest.fn(() => ({
    getCompositionSettings: jest.fn().mockResolvedValue({}),
  })),
}))
jest.mock('../../src/utils/ai-retry', () => ({
  withAIRetry: jest.fn((fn: any) => fn()),
}))

import { generateEmailSequence, generateSMS, generatePropertyDescription } from '../../src/controllers/ai-generation.controller'

function mockReqRes(query = {}, body = {}, params = {}) {
  return {
    req: { query, body, params, user: { userId: 'u1', organizationId: 'org-1', role: 'ADMIN', email: 'a@test.com' }, ip: '127.0.0.1', headers: { 'user-agent': 'jest' } } as any,
    res: { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any,
  }
}

beforeEach(() => {
  mockReset(mockPrisma)
  jest.clearAllMocks()
})

describe('ai-generation.controller', () => {
  describe('generateEmailSequence', () => {
    it('generates email sequence', async () => {
      const { req, res } = mockReqRes({}, {
        goal: 'nurture', leadName: 'John', propertyType: 'CONDO', tone: 'professional',
      })

      await generateEmailSequence(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })

  describe('generateSMS', () => {
    it('generates SMS content', async () => {
      const { req, res } = mockReqRes({}, {
        goal: 'follow-up', leadName: 'John', propertyType: 'SINGLE_FAMILY', tone: 'friendly',
      })

      await generateSMS(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })

  describe('generatePropertyDescription', () => {
    it('generates property description', async () => {
      const { req, res } = mockReqRes({}, {
        address: '123 Main St', propertyType: 'SINGLE_FAMILY',
        bedrooms: 3, bathrooms: 2, squareFeet: 1500, price: 350000,
        features: ['pool', 'garage'],
      })

      await generatePropertyDescription(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })
})
