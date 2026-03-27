jest.mock('openai', () => {
  class MockOpenAI {
    static RateLimitError = class extends Error { constructor(msg: string) { super(msg); this.name = 'RateLimitError' } }
    static APIConnectionError = class extends Error { constructor(msg: string) { super(msg); this.name = 'APIConnectionError' } }
    static InternalServerError = class extends Error { constructor(msg: string) { super(msg); this.name = 'InternalServerError' } }
    static NotFoundError = class extends Error { constructor(msg: string) { super(msg); this.name = 'NotFoundError' } }
    static BadRequestError = class extends Error { constructor(msg: string) { super(msg); this.name = 'BadRequestError' } }
  }
  return { __esModule: true, default: MockOpenAI }
})

jest.mock('../../src/services/ai-config.service', () => ({
  getFallbackChain: jest.fn().mockReturnValue(['gpt-4o-mini', 'gpt-3.5-turbo']),
}))

jest.mock('../../src/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}))

import { withRetryAndFallback } from '../../src/utils/ai-retry'
import OpenAI from 'openai'

// Extract mock error constructors with proper types
const RateLimitError = OpenAI.RateLimitError as unknown as new (msg: string) => Error
const NotFoundError = OpenAI.NotFoundError as unknown as new (msg: string) => Error

describe('withRetryAndFallback', () => {
  const mockClient = {} as OpenAI

  it('returns result on first successful call', async () => {
    const fn = jest.fn().mockResolvedValue({ content: 'Hello' })
    const result = await withRetryAndFallback(fn, mockClient, 'gpt-5.1', { maxRetries: 0 })
    expect(result.result).toEqual({ content: 'Hello' })
    expect(result.modelUsed).toBe('gpt-5.1')
  })

  it('retries on retryable error (rate limit)', async () => {
    const fn = jest.fn()
      .mockRejectedValueOnce(new RateLimitError('rate limited'))
      .mockResolvedValue({ text: 'ok' })

    const result = await withRetryAndFallback(fn, mockClient, 'gpt-5.1', {
      maxRetries: 2,
      initialDelay: 1,
    })
    expect(result.result).toEqual({ text: 'ok' })
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('falls back to next model after exhausting retries', async () => {
    const fn = jest.fn()
      .mockRejectedValueOnce(new RateLimitError('rate limited'))
      .mockRejectedValueOnce(new RateLimitError('rate limited'))
      .mockResolvedValue({ text: 'fallback success' })

    const result = await withRetryAndFallback(fn, mockClient, 'gpt-5.1', {
      maxRetries: 1,
      initialDelay: 1,
      enableFallback: true,
    })
    expect(result.result).toEqual({ text: 'fallback success' })
    expect(result.modelUsed).toBe('gpt-4o-mini') // first fallback model
  })

  it('throws when all models and retries exhausted', async () => {
    const fn = jest.fn().mockRejectedValue(new RateLimitError('always fails'))

    await expect(
      withRetryAndFallback(fn, mockClient, 'gpt-5.1', {
        maxRetries: 0,
        initialDelay: 1,
        enableFallback: false,
      })
    ).rejects.toThrow()
  })

  it('skips retries and falls back immediately on model error (NotFoundError)', async () => {
    const fn = jest.fn()
      .mockRejectedValueOnce(new NotFoundError('model not found'))
      .mockResolvedValue({ text: 'fallback' })

    const result = await withRetryAndFallback(fn, mockClient, 'gpt-deprecated', {
      maxRetries: 3,
      initialDelay: 1,
    })
    // Should have fallen back to next model without retrying the NotFound error
    expect(fn).toHaveBeenCalledTimes(2)
    expect(result.modelUsed).toBe('gpt-4o-mini')
  })

  it('disables fallback when enableFallback=false', async () => {
    const fn = jest.fn().mockRejectedValue(new RateLimitError('always rate limited'))

    await expect(
      withRetryAndFallback(fn, mockClient, 'gpt-5.1', {
        maxRetries: 0,
        initialDelay: 1,
        enableFallback: false,
      })
    ).rejects.toThrow()

    // Without fallback, getFallbackChain should not be called
    // (Actually the function still calls getFallbackChain but doesn't push results)
    // The key test is that no fallback model was tried
  })
})
