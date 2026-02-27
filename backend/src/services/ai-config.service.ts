/**
 * AI Configuration Service (Phase 3B)
 * Resolves which OpenAI key, model, and config to use per request.
 *
 * Resolution order:
 * 1. If org has useOwnAIKey=true AND openaiApiKey is set → use their key
 * 2. Otherwise → use platform key from process.env.OPENAI_API_KEY
 *
 * Also handles:
 * - Per-org model selection
 * - Per-org system prompt prepending
 * - Per-org tone defaults
 * - Token limit enforcement per tier
 * - OpenAI client caching per org
 */

import OpenAI from 'openai'
import prisma from '../config/database'
import { decrypt, encrypt, maskSensitive } from '../utils/encryption'
import { AI_PLAN_LIMITS } from '../config/subscriptions'
import { SubscriptionTier } from '@prisma/client'

// Model tier configuration (from plan)
export const MODEL_TIERS = {
  mainModel: 'gpt-5.1',
  fastModel: 'gpt-5-mini',
  nanoModel: 'gpt-5-nano',
  deepModel: 'gpt-5.2',
  premiumModel: 'gpt-5.2-pro',
  fallbackModel: 'gpt-4o-mini',
  voiceModel: 'gpt-realtime-mini',
} as const

// Updated pricing (Feb 2026)
export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-5.2-pro': { input: 21.0 / 1_000_000, output: 168.0 / 1_000_000 },
  'gpt-5.2': { input: 1.75 / 1_000_000, output: 14.0 / 1_000_000 },
  'gpt-5.1': { input: 1.25 / 1_000_000, output: 10.0 / 1_000_000 },
  'gpt-5': { input: 1.25 / 1_000_000, output: 10.0 / 1_000_000 },
  'gpt-5-mini': { input: 0.25 / 1_000_000, output: 2.0 / 1_000_000 },
  'gpt-5-nano': { input: 0.05 / 1_000_000, output: 0.40 / 1_000_000 },
  'gpt-4.1': { input: 2.0 / 1_000_000, output: 8.0 / 1_000_000 },
  'gpt-4.1-mini': { input: 0.40 / 1_000_000, output: 1.60 / 1_000_000 },
  'gpt-4.1-nano': { input: 0.10 / 1_000_000, output: 0.40 / 1_000_000 },
  'gpt-4o': { input: 2.50 / 1_000_000, output: 10.0 / 1_000_000 },
  'gpt-4o-mini': { input: 0.15 / 1_000_000, output: 0.60 / 1_000_000 },
  'gpt-4-turbo-preview': { input: 10.0 / 1_000_000, output: 30.0 / 1_000_000 },
}

export interface AIConfig {
  apiKey: string
  orgId?: string
  model: string
  maxTokens: number
  systemPrompt?: string
  defaultTone: string
  useOwnKey: boolean
  tier: SubscriptionTier
}

// Cache OpenAI client instances per org to avoid re-creating them
const clientCache = new Map<string, { client: OpenAI; createdAt: number }>()
const CLIENT_CACHE_TTL = 10 * 60 * 1000 // 10 minutes

/**
 * Resolve the AI configuration for a given organization.
 * This determines which API key, model, and settings to use.
 */
export async function resolveAIConfig(organizationId: string): Promise<AIConfig> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      useOwnAIKey: true,
      openaiApiKey: true,
      openaiOrgId: true,
      aiDefaultModel: true,
      aiDefaultTone: true,
      aiSystemPrompt: true,
      aiMaxTokensPerRequest: true,
      subscriptionTier: true,
    },
  })

  if (!org) {
    throw new Error(`Organization ${organizationId} not found`)
  }

  const tier = org.subscriptionTier || 'FREE'
  const limits = AI_PLAN_LIMITS[tier as SubscriptionTier]

  // Determine API key
  let apiKey: string
  let useOwnKey = false
  let orgId: string | undefined

  if (org.useOwnAIKey && org.openaiApiKey) {
    try {
      apiKey = decrypt(org.openaiApiKey)
      useOwnKey = true
      orgId = org.openaiOrgId || undefined
    } catch {
      // If decryption fails, fall back to platform key
      console.warn(`Failed to decrypt API key for org ${organizationId}, using platform key`)
      apiKey = process.env.OPENAI_API_KEY || ''
    }
  } else {
    apiKey = process.env.OPENAI_API_KEY || ''
  }

  if (!apiKey) {
    throw new Error('No OpenAI API key available')
  }

  // Determine model
  const model = org.aiDefaultModel || process.env.OPENAI_MODEL || MODEL_TIERS.mainModel

  // Determine max tokens
  const maxTokens = org.aiMaxTokensPerRequest || limits.maxTokensPerRequest

  return {
    apiKey,
    orgId,
    model,
    maxTokens,
    systemPrompt: org.aiSystemPrompt || undefined,
    defaultTone: org.aiDefaultTone || 'professional',
    useOwnKey,
    tier: tier as SubscriptionTier,
  }
}

/**
 * Get an OpenAI client for the given organization.
 * Caches client instances to avoid re-creating them.
 */
export async function getOpenAIClient(organizationId: string): Promise<{ client: OpenAI; config: AIConfig }> {
  const config = await resolveAIConfig(organizationId)

  // Cache key includes the API key hash to invalidate on key change
  const cacheKey = `${organizationId}:${config.apiKey.slice(-8)}`
  const cached = clientCache.get(cacheKey)

  if (cached && Date.now() - cached.createdAt < CLIENT_CACHE_TTL) {
    return { client: cached.client, config }
  }

  const client = new OpenAI({
    apiKey: config.apiKey,
    organization: config.orgId,
  })

  clientCache.set(cacheKey, { client, createdAt: Date.now() })

  return { client, config }
}

/**
 * Get the appropriate model for a specific feature/task type.
 * Uses the tier system from the master plan.
 */
export function getModelForTask(
  task: 'chat' | 'compose' | 'content' | 'enhance' | 'sms' | 'score' | 'suggest' | 'deep_analysis' | 'premium',
  orgModel?: string | null
): string {
  // If org has a specific model preference, use it for main model tasks
  if (orgModel && ['chat', 'compose', 'content'].includes(task)) {
    return orgModel
  }

  switch (task) {
    // Tier 1: mainModel — user-facing intelligence
    case 'chat':
    case 'compose':
    case 'content':
      return MODEL_TIERS.mainModel
    // Tier 2: fastModel — background brain
    case 'enhance':
    case 'sms':
    case 'suggest':
      return MODEL_TIERS.fastModel
    // Tier 3: nanoModel — ultra-cheap background work
    case 'score':
      return MODEL_TIERS.nanoModel
    // Tier 4: deepModel — complex analysis
    case 'deep_analysis':
      return MODEL_TIERS.deepModel
    // Tier 5: premiumModel — enterprise upsell
    case 'premium':
      return MODEL_TIERS.premiumModel
    default:
      return MODEL_TIERS.mainModel
  }
}

/**
 * Calculate cost based on tokens used with updated pricing.
 */
export function calculateCost(tokens: number, model: string): number {
  const pricing = MODEL_PRICING[model] || MODEL_PRICING['gpt-4o-mini']
  // Approximate: assume 50/50 split between input and output
  const avgCost = (pricing.input + pricing.output) / 2
  return tokens * avgCost
}

/**
 * Build the full system prompt for an org, prepending org-specific instructions.
 */
export function buildSystemPrompt(basePrompt: string, orgConfig: AIConfig): string {
  const parts: string[] = []

  if (orgConfig.systemPrompt) {
    parts.push(`ORGANIZATION INSTRUCTIONS:\n${orgConfig.systemPrompt}\n`)
  }

  if (orgConfig.defaultTone && orgConfig.defaultTone !== 'professional') {
    parts.push(`DEFAULT TONE: Use a ${orgConfig.defaultTone} tone unless otherwise specified.\n`)
  }

  parts.push(basePrompt)

  return parts.join('\n')
}

/**
 * Save org AI settings (for the settings page).
 * Encrypts the API key before storing.
 */
export async function updateOrgAISettings(
  organizationId: string,
  settings: {
    openaiApiKey?: string
    openaiOrgId?: string
    useOwnAIKey?: boolean
    aiSystemPrompt?: string
    aiDefaultTone?: string
    aiDefaultModel?: string
    aiMaxTokensPerRequest?: number
    aiMonthlyTokenBudget?: number
  }
) {
  const updateData: any = {}

  if (settings.useOwnAIKey !== undefined) updateData.useOwnAIKey = settings.useOwnAIKey
  if (settings.openaiOrgId !== undefined) updateData.openaiOrgId = settings.openaiOrgId
  if (settings.aiSystemPrompt !== undefined) updateData.aiSystemPrompt = settings.aiSystemPrompt
  if (settings.aiDefaultTone !== undefined) updateData.aiDefaultTone = settings.aiDefaultTone
  if (settings.aiDefaultModel !== undefined) updateData.aiDefaultModel = settings.aiDefaultModel
  if (settings.aiMaxTokensPerRequest !== undefined) updateData.aiMaxTokensPerRequest = settings.aiMaxTokensPerRequest
  if (settings.aiMonthlyTokenBudget !== undefined) updateData.aiMonthlyTokenBudget = settings.aiMonthlyTokenBudget

  // Encrypt API key if provided
  if (settings.openaiApiKey) {
    updateData.openaiApiKey = encrypt(settings.openaiApiKey)
  }

  // Invalidate client cache for this org
  for (const key of clientCache.keys()) {
    if (key.startsWith(`${organizationId}:`)) {
      clientCache.delete(key)
    }
  }

  return prisma.organization.update({
    where: { id: organizationId },
    data: updateData,
    select: {
      id: true,
      useOwnAIKey: true,
      openaiOrgId: true,
      aiSystemPrompt: true,
      aiDefaultTone: true,
      aiDefaultModel: true,
      aiMaxTokensPerRequest: true,
      aiMonthlyTokenBudget: true,
      // Never return the actual API key — return masked version
      openaiApiKey: true,
    },
  }).then(org => ({
    ...org,
    openaiApiKey: org.openaiApiKey ? maskSensitive(org.openaiApiKey) : null,
  }))
}

/**
 * Get org AI settings (for settings page).
 * Returns masked API key, never plaintext.
 */
export async function getOrgAISettings(organizationId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      useOwnAIKey: true,
      openaiApiKey: true,
      openaiOrgId: true,
      aiSystemPrompt: true,
      aiDefaultTone: true,
      aiDefaultModel: true,
      aiMaxTokensPerRequest: true,
      aiMonthlyTokenBudget: true,
      subscriptionTier: true,
    },
  })

  if (!org) {
    throw new Error(`Organization ${organizationId} not found`)
  }

  return {
    useOwnAIKey: org.useOwnAIKey,
    hasApiKey: !!org.openaiApiKey,
    openaiApiKeyMasked: org.openaiApiKey ? maskSensitive('sk-' + org.openaiApiKey.slice(-10)) : null,
    openaiOrgId: org.openaiOrgId,
    aiSystemPrompt: org.aiSystemPrompt,
    aiDefaultTone: org.aiDefaultTone,
    aiDefaultModel: org.aiDefaultModel,
    aiMaxTokensPerRequest: org.aiMaxTokensPerRequest,
    aiMonthlyTokenBudget: org.aiMonthlyTokenBudget,
    subscriptionTier: org.subscriptionTier,
    availableModels: Object.entries(MODEL_TIERS).map(([tier, model]) => ({
      tier,
      model,
      inputCost: MODEL_PRICING[model]?.input ? `$${(MODEL_PRICING[model].input * 1_000_000).toFixed(2)}/1M tokens` : 'N/A',
      outputCost: MODEL_PRICING[model]?.output ? `$${(MODEL_PRICING[model].output * 1_000_000).toFixed(2)}/1M tokens` : 'N/A',
    })),
  }
}

/**
 * Get fallback chain for a model tier.
 * Returns ordered list of models to try.
 */
export function getFallbackChain(model: string): string[] {
  const chains: Record<string, string[]> = {
    [MODEL_TIERS.premiumModel]: [MODEL_TIERS.deepModel, MODEL_TIERS.mainModel, MODEL_TIERS.fallbackModel],
    [MODEL_TIERS.deepModel]: [MODEL_TIERS.mainModel, MODEL_TIERS.fallbackModel],
    [MODEL_TIERS.mainModel]: [MODEL_TIERS.fastModel, MODEL_TIERS.fallbackModel],
    [MODEL_TIERS.fastModel]: [MODEL_TIERS.fallbackModel],
    [MODEL_TIERS.nanoModel]: [MODEL_TIERS.fallbackModel],
  }
  return chains[model] || [MODEL_TIERS.fallbackModel]
}
