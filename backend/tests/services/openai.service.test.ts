import { ASSISTANT_TONES } from '../../src/services/openai.service'

jest.mock('../../src/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }
}))

jest.mock('../../src/services/ai-config.service', () => ({
  getOpenAIClient: jest.fn(),
  getModelForTask: jest.fn().mockReturnValue('gpt-4'),
  calculateCost: jest.fn().mockReturnValue(0.01),
  buildSystemPrompt: jest.fn().mockReturnValue('You are a helpful assistant.'),
}))

jest.mock('../../src/utils/ai-retry', () => ({
  withRetryAndFallback: jest.fn((fn: any) => fn()),
}))

jest.mock('../../src/utils/ai-logger', () => ({
  aiLogger: { log: jest.fn(), getStats: jest.fn() },
}))

jest.mock('../../src/services/ai-cache.service', () => ({
  buildCacheKey: jest.fn().mockReturnValue('cache-key'),
  getOrCompute: jest.fn((key: string, fn: any) => fn()),
}))

describe('openai.service', () => {
  describe('ASSISTANT_TONES', () => {
    it('exports all tone presets', () => {
      expect(ASSISTANT_TONES).toHaveProperty('PROFESSIONAL')
      expect(ASSISTANT_TONES).toHaveProperty('FRIENDLY')
      expect(ASSISTANT_TONES).toHaveProperty('DIRECT')
      expect(ASSISTANT_TONES).toHaveProperty('COACHING')
      expect(ASSISTANT_TONES).toHaveProperty('CASUAL')
    })

    it('each tone has required properties', () => {
      for (const [key, tone] of Object.entries(ASSISTANT_TONES)) {
        expect(tone).toHaveProperty('name')
        expect(tone).toHaveProperty('description')
        expect(tone).toHaveProperty('temperature')
        expect(tone).toHaveProperty('systemAddition')
        expect(typeof tone.temperature).toBe('number')
        expect(tone.temperature).toBeGreaterThanOrEqual(0)
        expect(tone.temperature).toBeLessThanOrEqual(1)
      }
    })

    it('PROFESSIONAL tone has low temperature', () => {
      expect(ASSISTANT_TONES.PROFESSIONAL.temperature).toBeLessThanOrEqual(0.6)
    })

    it('CASUAL tone has high temperature', () => {
      expect(ASSISTANT_TONES.CASUAL.temperature).toBeGreaterThanOrEqual(0.7)
    })
  })
})
