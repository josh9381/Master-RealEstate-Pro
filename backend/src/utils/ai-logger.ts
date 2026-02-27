/**
 * AI Structured Logger (Phase 5B)
 * Logs every AI call with model, tokens, latency, cost, org, user.
 * Structured JSON format for production log aggregation.
 */

export interface AILogEntry {
  timestamp: string
  event: 'ai_call_start' | 'ai_call_success' | 'ai_call_error' | 'ai_spend_alert'
  service: string
  method: string
  model: string
  modelUsed?: string         // actual model after fallback
  organizationId?: string
  userId?: string
  tokens?: number
  inputTokens?: number
  outputTokens?: number
  cost?: number
  latencyMs?: number
  retryCount?: number
  fallback?: boolean
  error?: string
  metadata?: Record<string, unknown>
}

class AILogger {
  private logLevel: 'debug' | 'info' | 'warn' | 'error' = 'info'

  constructor() {
    const level = process.env.AI_LOG_LEVEL || 'info'
    if (['debug', 'info', 'warn', 'error'].includes(level)) {
      this.logLevel = level as typeof this.logLevel
    }
  }

  /**
   * Log the start of an AI call
   */
  start(params: {
    method: string
    model: string
    organizationId?: string
    userId?: string
    metadata?: Record<string, unknown>
  }): { startTime: number } {
    const entry: AILogEntry = {
      timestamp: new Date().toISOString(),
      event: 'ai_call_start',
      service: 'openai',
      method: params.method,
      model: params.model,
      organizationId: params.organizationId,
      userId: params.userId,
      metadata: params.metadata,
    }

    if (this.shouldLog('debug')) {
      console.log(JSON.stringify(entry))
    }

    return { startTime: Date.now() }
  }

  /**
   * Log a successful AI call
   */
  success(params: {
    method: string
    model: string
    modelUsed?: string
    organizationId?: string
    userId?: string
    tokens?: number
    inputTokens?: number
    outputTokens?: number
    cost?: number
    startTime: number
    retryCount?: number
    metadata?: Record<string, unknown>
  }): void {
    const latencyMs = Date.now() - params.startTime
    const entry: AILogEntry = {
      timestamp: new Date().toISOString(),
      event: 'ai_call_success',
      service: 'openai',
      method: params.method,
      model: params.model,
      modelUsed: params.modelUsed || params.model,
      organizationId: params.organizationId,
      userId: params.userId,
      tokens: params.tokens,
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      cost: params.cost,
      latencyMs,
      retryCount: params.retryCount,
      fallback: params.modelUsed !== undefined && params.modelUsed !== params.model,
      metadata: params.metadata,
    }

    if (this.shouldLog('info')) {
      console.log(JSON.stringify(entry))
    }
  }

  /**
   * Log a failed AI call
   */
  error(params: {
    method: string
    model: string
    organizationId?: string
    userId?: string
    error: unknown
    startTime: number
    retryCount?: number
    metadata?: Record<string, unknown>
  }): void {
    const latencyMs = Date.now() - params.startTime
    const errorMessage = params.error instanceof Error ? params.error.message : String(params.error)

    const entry: AILogEntry = {
      timestamp: new Date().toISOString(),
      event: 'ai_call_error',
      service: 'openai',
      method: params.method,
      model: params.model,
      organizationId: params.organizationId,
      userId: params.userId,
      latencyMs,
      retryCount: params.retryCount,
      error: errorMessage,
      metadata: params.metadata,
    }

    console.error(JSON.stringify(entry))
  }

  /**
   * Log a spend alert
   */
  spendAlert(params: {
    organizationId: string
    currentSpend: number
    threshold: number
    period: string
  }): void {
    const entry: AILogEntry = {
      timestamp: new Date().toISOString(),
      event: 'ai_spend_alert',
      service: 'openai',
      method: 'spend_check',
      model: 'N/A',
      organizationId: params.organizationId,
      metadata: {
        currentSpend: params.currentSpend,
        threshold: params.threshold,
        period: params.period,
        percentOfThreshold: Math.round((params.currentSpend / params.threshold) * 100),
      },
    }

    console.warn(JSON.stringify(entry))
  }

  private shouldLog(level: string): boolean {
    const levels = ['debug', 'info', 'warn', 'error']
    return levels.indexOf(level) >= levels.indexOf(this.logLevel)
  }
}

// Singleton
export const aiLogger = new AILogger()
