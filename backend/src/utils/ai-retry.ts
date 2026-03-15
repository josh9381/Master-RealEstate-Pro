/**
 * AI Retry & Fallback Utility (Phase 5A)
 * Wraps OpenAI calls with exponential backoff and model fallback chains.
 *
 * Usage:
 *   const result = await withRetryAndFallback(
 *     (client, model) => client.chat.completions.create({ model, ... }),
 *     client, model, getFallbackChain(model)
 *   );
 */

import OpenAI from 'openai'
import { getFallbackChain } from '../services/ai-config.service'

export interface RetryOptions {
  /** Max number of retries per model before falling back (default: 3) */
  maxRetries?: number
  /** Initial delay in ms (default: 500) */
  initialDelay?: number
  /** Maximum delay in ms (default: 10000) */
  maxDelay?: number
  /** Backoff multiplier (default: 2) */
  backoffMultiplier?: number
  /** Enable model fallback on exhausted retries (default: true) */
  enableFallback?: boolean
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 500,
  maxDelay: 10_000,
  backoffMultiplier: 2,
  enableFallback: true,
}

/** Errors that are safe to retry */
function isRetryable(error: unknown): boolean {
  if (error instanceof OpenAI.RateLimitError) return true
  if (error instanceof OpenAI.APIConnectionError) return true
  if (error instanceof OpenAI.InternalServerError) return true

  // Generic network / timeout errors
  const msg = error instanceof Error ? error.message.toLowerCase() : ''
  if (msg.includes('timeout') || msg.includes('econnreset') || msg.includes('socket hang up')) return true

  return false
}

/** Check if error suggests a model-level failure (model not found or deprecated) */
function isModelError(error: unknown): boolean {
  if (error instanceof OpenAI.NotFoundError) return true
  if (error instanceof OpenAI.BadRequestError) {
    const msg = (error as any).message?.toLowerCase() || ''
    if (msg.includes('model') || msg.includes('does not exist') || msg.includes('deprecated')) return true
  }
  return false
}

/**
 * Execute an OpenAI call with retry + fallback.
 *
 * @param fn - The async function to call. Receives (client, model) and returns a result.
 * @param client - The OpenAI client instance
 * @param primaryModel - The primary model to try
 * @param opts - Retry/backoff options
 * @returns The result of the call
 */
export async function withRetryAndFallback<T>(
  fn: (client: OpenAI, model: string) => Promise<T>,
  client: OpenAI,
  primaryModel: string,
  opts?: RetryOptions
): Promise<{ result: T; modelUsed: string }> {
  const options = { ...DEFAULT_OPTIONS, ...opts }
  const modelsToTry = [primaryModel]

  if (options.enableFallback) {
    modelsToTry.push(...getFallbackChain(primaryModel))
  }

  let lastError: unknown = null

  for (const model of modelsToTry) {
    let delay = options.initialDelay

    for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
      try {
        const result = await fn(client, model)
        if (model !== primaryModel) {
          console.warn(`[AI Retry] Succeeded with fallback model ${model} (primary was ${primaryModel})`)
        }
        return { result, modelUsed: model }
      } catch (error) {
        lastError = error

        // If it's a model error (model doesn't exist), skip remaining retries and try next model
        if (isModelError(error)) {
          console.warn(`[AI Retry] Model ${model} not available, trying next fallback`)
          break
        }

        // If not retryable, throw immediately
        if (!isRetryable(error)) {
          throw error
        }

        // If we've exhausted retries for this model, move to next
        if (attempt === options.maxRetries) {
          console.warn(`[AI Retry] Exhausted ${options.maxRetries} retries for model ${model}`)
          break
        }

        // Wait with exponential backoff + jitter
        const jitter = Math.random() * 0.3 * delay
        const waitTime = Math.min(delay + jitter, options.maxDelay)
        console.warn(`[AI Retry] Attempt ${attempt + 1}/${options.maxRetries} for ${model} failed, retrying in ${Math.round(waitTime)}ms`)
        await sleep(waitTime)
        delay *= options.backoffMultiplier
      }
    }
  }

  // All models exhausted
  throw lastError || new Error('All AI models and retries exhausted')
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
