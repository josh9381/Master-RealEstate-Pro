import { mockDeep, mockReset } from 'jest-mock-extended'
import { PrismaClient } from '@prisma/client'

const mockPrisma = mockDeep<PrismaClient>()
jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: mockPrisma,
  prisma: mockPrisma,
}))

jest.mock('../../src/lib/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }))
jest.mock('../../src/utils/encryption', () => ({
  encrypt: jest.fn((v: string) => `enc:${v}`),
  decrypt: jest.fn((v: string) => v.replace('enc:', '')),
  maskSensitive: jest.fn((v: string) => '****'),
}))

jest.mock('openai', () => {
  const OpenAI = jest.fn(() => ({ chat: { completions: { create: jest.fn() } } }))
  return { __esModule: true, default: OpenAI }
})

import {
  MODEL_TIERS,
  MODEL_PRICING,
  resolveAIConfig,
  getModelForTask,
  calculateCost,
  buildSystemPrompt,
} from '../../src/services/ai-config.service'

describe('ai-config.service', () => {
  beforeEach(() => {
    mockReset(mockPrisma)
    process.env.OPENAI_API_KEY = 'sk-platform-test-key'
  })

  afterEach(() => {
    delete process.env.OPENAI_API_KEY
  })

  describe('MODEL_TIERS constants', () => {
    it('has mainModel, fastModel, nanoModel, deepModel, premiumModel, fallbackModel, voiceModel', () => {
      expect(MODEL_TIERS).toHaveProperty('mainModel')
      expect(MODEL_TIERS).toHaveProperty('fastModel')
      expect(MODEL_TIERS).toHaveProperty('nanoModel')
      expect(MODEL_TIERS).toHaveProperty('deepModel')
      expect(MODEL_TIERS).toHaveProperty('premiumModel')
      expect(MODEL_TIERS).toHaveProperty('fallbackModel')
      expect(MODEL_TIERS).toHaveProperty('voiceModel')
    })
  })

  describe('MODEL_PRICING constants', () => {
    it('has pricing for gpt-4o-mini', () => {
      expect(MODEL_PRICING['gpt-4o-mini']).toBeDefined()
      expect(MODEL_PRICING['gpt-4o-mini'].input).toBeGreaterThan(0)
      expect(MODEL_PRICING['gpt-4o-mini'].output).toBeGreaterThan(0)
    })

    it('output price is always >= input price', () => {
      Object.values(MODEL_PRICING).forEach(({ input, output }) => {
        expect(output).toBeGreaterThanOrEqual(input)
      })
    })
  })

  describe('resolveAIConfig', () => {
    it('throws if organization not found', async () => {
      ;(mockPrisma.organization.findUnique as jest.Mock).mockResolvedValue(null)
      await expect(resolveAIConfig('nonexistent')).rejects.toThrow('Organization nonexistent not found')
    })

    it('uses platform key when useOwnAIKey=false', async () => {
      ;(mockPrisma.organization.findUnique as jest.Mock).mockResolvedValue({
        useOwnAIKey: false,
        openaiApiKey: null,
        openaiOrgId: null,
        aiDefaultModel: null,
        aiDefaultTone: null,
        aiSystemPrompt: null,
        aiMaxTokensPerRequest: null,
        subscriptionTier: 'PROFESSIONAL',
      })

      const config = await resolveAIConfig('org1')
      expect(config.apiKey).toBe('sk-platform-test-key')
      expect(config.useOwnKey).toBe(false)
    })

    it('uses org own key when useOwnAIKey=true and key present', async () => {
      const { decrypt } = require('../../src/utils/encryption')
      decrypt.mockReturnValueOnce('sk-org-own-key')
      ;(mockPrisma.organization.findUnique as jest.Mock).mockResolvedValue({
        useOwnAIKey: true,
        openaiApiKey: 'enc:sk-org-own-key',
        openaiOrgId: 'org-id-123',
        aiDefaultModel: null,
        aiDefaultTone: 'casual',
        aiSystemPrompt: 'You are helpful.',
        aiMaxTokensPerRequest: 2000,
        subscriptionTier: 'PROFESSIONAL',
      })

      const config = await resolveAIConfig('org2')
      expect(config.useOwnKey).toBe(true)
      expect(config.defaultTone).toBe('casual')
      expect(config.systemPrompt).toBe('You are helpful.')
      expect(config.maxTokens).toBe(2000)
    })

    it('falls back to platform key when decryption fails', async () => {
      const { decrypt } = require('../../src/utils/encryption')
      decrypt.mockImplementationOnce(() => { throw new Error('bad cipher') })
      ;(mockPrisma.organization.findUnique as jest.Mock).mockResolvedValue({
        useOwnAIKey: true,
        openaiApiKey: 'bad-cipher-text',
        openaiOrgId: null,
        aiDefaultModel: null,
        aiDefaultTone: null,
        aiSystemPrompt: null,
        aiMaxTokensPerRequest: null,
        subscriptionTier: 'STARTER',
      })

      const config = await resolveAIConfig('org3')
      expect(config.apiKey).toBe('sk-platform-test-key')
      expect(config.useOwnKey).toBe(false)
    })

    it('throws when no API key is available', async () => {
      delete process.env.OPENAI_API_KEY
      ;(mockPrisma.organization.findUnique as jest.Mock).mockResolvedValue({
        useOwnAIKey: false,
        openaiApiKey: null,
        openaiOrgId: null,
        aiDefaultModel: null,
        aiDefaultTone: null,
        aiSystemPrompt: null,
        aiMaxTokensPerRequest: null,
        subscriptionTier: 'STARTER',
      })

      await expect(resolveAIConfig('org4')).rejects.toThrow('No OpenAI API key available')
    })
  })

  describe('getModelForTask', () => {
    it('returns mainModel for chat/compose/content', () => {
      expect(getModelForTask('chat')).toBe(MODEL_TIERS.mainModel)
      expect(getModelForTask('compose')).toBe(MODEL_TIERS.mainModel)
      expect(getModelForTask('content')).toBe(MODEL_TIERS.mainModel)
    })

    it('returns fastModel for enhance/sms/suggest', () => {
      expect(getModelForTask('enhance')).toBe(MODEL_TIERS.fastModel)
      expect(getModelForTask('sms')).toBe(MODEL_TIERS.fastModel)
      expect(getModelForTask('suggest')).toBe(MODEL_TIERS.fastModel)
    })

    it('returns nanoModel for score task', () => {
      expect(getModelForTask('score')).toBe(MODEL_TIERS.nanoModel)
    })

    it('returns deepModel for deep_analysis task', () => {
      expect(getModelForTask('deep_analysis')).toBe(MODEL_TIERS.deepModel)
    })

    it('returns premiumModel for premium task', () => {
      expect(getModelForTask('premium')).toBe(MODEL_TIERS.premiumModel)
    })

    it('uses orgModel override for chat/compose/content', () => {
      expect(getModelForTask('chat', 'gpt-custom-org-model')).toBe('gpt-custom-org-model')
      expect(getModelForTask('compose', 'gpt-custom')).toBe('gpt-custom')
    })

    it('ignores orgModel for non-main tasks like score', () => {
      expect(getModelForTask('score', 'gpt-custom')).toBe(MODEL_TIERS.nanoModel)
    })
  })

  describe('calculateCost', () => {
    it('calculates cost for known model', () => {
      const cost = calculateCost(1_000_000, 'gpt-4o-mini')
      // avg of input (0.15/1M) and output (0.60/1M) = 0.375/1M per token
      const expected = ((0.15 + 0.60) / 2) / 1_000_000 * 1_000_000
      expect(cost).toBeCloseTo(expected, 5)
    })

    it('falls back to gpt-4o-mini pricing for unknown model', () => {
      const costKnown = calculateCost(100, 'gpt-4o-mini')
      const costUnknown = calculateCost(100, 'nonexistent-model-xyz')
      expect(costUnknown).toBeCloseTo(costKnown, 10)
    })

    it('returns 0 for 0 tokens', () => {
      expect(calculateCost(0, 'gpt-4o')).toBe(0)
    })
  })

  describe('buildSystemPrompt', () => {
    const baseConfig = {
      apiKey: 'key',
      model: 'gpt-4o',
      maxTokens: 1000,
      defaultTone: 'professional',
      useOwnKey: false,
      tier: 'PROFESSIONAL' as any,
    }

    it('returns just the base prompt when no systemPrompt or custom tone', () => {
      const result = buildSystemPrompt('Help the user.', baseConfig)
      expect(result).toBe('Help the user.')
    })

    it('prepends org system prompt when present', () => {
      const result = buildSystemPrompt('Base.', { ...baseConfig, systemPrompt: 'Be formal.' })
      expect(result).toContain('ORGANIZATION INSTRUCTIONS:')
      expect(result).toContain('Be formal.')
      expect(result).toContain('Base.')
    })

    it('prepends tone instruction when defaultTone is not professional', () => {
      const result = buildSystemPrompt('Base.', { ...baseConfig, defaultTone: 'casual' })
      expect(result).toContain('DEFAULT TONE: Use a casual tone')
      expect(result).toContain('Base.')
    })

    it('does not duplicate tone instruction for professional tone', () => {
      const result = buildSystemPrompt('Base.', baseConfig)
      expect(result).not.toContain('DEFAULT TONE')
    })
  })
})
