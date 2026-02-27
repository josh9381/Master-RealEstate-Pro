/**
 * User Preferences Service (Phase 4 — Database-backed)
 * Manages AI Composer user preferences and defaults
 * Persisted in UserAIPreferences table via Prisma
 */

import prisma from '../config/database'

export interface ComposerPreferences {
  defaultTone: string
  defaultLength: string
  defaultCTA: boolean
  defaultPersonalization: string
  autoGenerate: boolean
  showAdvanced: boolean
}

export interface AIProfilePreferences {
  brandGuidelines: string | null
  businessContext: string | null
  defaultEmailStructure: string
  propertyDescStyle: string
  socialMediaPrefs: Record<string, unknown> | null
  enhancementLevel: string
}

export interface FeatureToggles {
  enableLeadScoring: boolean
  enableCompose: boolean
  enableContentGen: boolean
  enableMessageEnhancer: boolean
  enableTemplateAI: boolean
  enableInsights: boolean
}

export interface FullAIPreferences {
  chatbot: {
    tone: string
    autoSuggestActions: boolean
    enableProactive: boolean
    preferredContactTime: string | null
    aiInsightsFrequency: string
    insightPriorityThreshold: string
    insightTypes: string[]
    customInstructions: string | null
  }
  composer: ComposerPreferences
  profile: AIProfilePreferences
  featureToggles: FeatureToggles
}

export const DEFAULT_PREFERENCES: ComposerPreferences = {
  defaultTone: 'professional',
  defaultLength: 'standard',
  defaultCTA: true,
  defaultPersonalization: 'standard',
  autoGenerate: true,
  showAdvanced: false
}

export const DEFAULT_PROFILE: AIProfilePreferences = {
  brandGuidelines: null,
  businessContext: null,
  defaultEmailStructure: 'professional',
  propertyDescStyle: 'balanced',
  socialMediaPrefs: null,
  enhancementLevel: 'moderate',
}

export const DEFAULT_FEATURE_TOGGLES: FeatureToggles = {
  enableLeadScoring: true,
  enableCompose: true,
  enableContentGen: true,
  enableMessageEnhancer: true,
  enableTemplateAI: true,
  enableInsights: true,
}

/**
 * Save or update user's composer preferences (upsert into UserAIPreferences)
 */
export async function saveComposerPreferences(
  userId: string,
  preferences: Partial<ComposerPreferences>,
  organizationId?: string
): Promise<ComposerPreferences> {
  // Determine the orgId: from argument, or look it up from the user
  let orgId = organizationId
  if (!orgId) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { organizationId: true } })
    orgId = user?.organizationId || ''
  }

  const record = await prisma.userAIPreferences.upsert({
    where: { userId },
    create: {
      userId,
      organizationId: orgId,
      composerDefaultTone: preferences.defaultTone ?? DEFAULT_PREFERENCES.defaultTone,
      composerDefaultLength: preferences.defaultLength ?? DEFAULT_PREFERENCES.defaultLength,
      composerDefaultCTA: preferences.defaultCTA ?? DEFAULT_PREFERENCES.defaultCTA,
      composerDefaultPersonalization: preferences.defaultPersonalization ?? DEFAULT_PREFERENCES.defaultPersonalization,
      composerAutoGenerate: preferences.autoGenerate ?? DEFAULT_PREFERENCES.autoGenerate,
      composerShowAdvanced: preferences.showAdvanced ?? DEFAULT_PREFERENCES.showAdvanced,
    },
    update: {
      ...(preferences.defaultTone !== undefined && { composerDefaultTone: preferences.defaultTone }),
      ...(preferences.defaultLength !== undefined && { composerDefaultLength: preferences.defaultLength }),
      ...(preferences.defaultCTA !== undefined && { composerDefaultCTA: preferences.defaultCTA }),
      ...(preferences.defaultPersonalization !== undefined && { composerDefaultPersonalization: preferences.defaultPersonalization }),
      ...(preferences.autoGenerate !== undefined && { composerAutoGenerate: preferences.autoGenerate }),
      ...(preferences.showAdvanced !== undefined && { composerShowAdvanced: preferences.showAdvanced }),
    },
  })

  return mapRecordToPreferences(record)
}

/**
 * Load user's composer preferences from DB
 */
export async function loadComposerPreferences(
  userId: string
): Promise<ComposerPreferences> {
  const record = await prisma.userAIPreferences.findUnique({
    where: { userId },
  })

  if (!record) {
    return { ...DEFAULT_PREFERENCES }
  }

  return mapRecordToPreferences(record)
}

/**
 * Reset preferences to defaults
 */
export async function resetComposerPreferences(
  userId: string
): Promise<ComposerPreferences> {
  const record = await prisma.userAIPreferences.findUnique({
    where: { userId },
  })

  if (record) {
    await prisma.userAIPreferences.update({
      where: { userId },
      data: {
        composerDefaultTone: DEFAULT_PREFERENCES.defaultTone,
        composerDefaultLength: DEFAULT_PREFERENCES.defaultLength,
        composerDefaultCTA: DEFAULT_PREFERENCES.defaultCTA,
        composerDefaultPersonalization: DEFAULT_PREFERENCES.defaultPersonalization,
        composerAutoGenerate: DEFAULT_PREFERENCES.autoGenerate,
        composerShowAdvanced: DEFAULT_PREFERENCES.showAdvanced,
      },
    })
  }

  return { ...DEFAULT_PREFERENCES }
}

/**
 * Get full AI preferences (chatbot + composer + profile + toggles) for a user
 */
export async function getFullAIPreferences(userId: string): Promise<FullAIPreferences> {
  const record = await prisma.userAIPreferences.findUnique({
    where: { userId },
  })

  if (!record) {
    return {
      chatbot: {
        tone: 'professional',
        autoSuggestActions: true,
        enableProactive: true,
        preferredContactTime: null,
        aiInsightsFrequency: 'daily',
        insightPriorityThreshold: 'all',
        insightTypes: ['lead_followup', 'scoring_accuracy', 'email_performance', 'pipeline_health'],
        customInstructions: null,
      },
      composer: { ...DEFAULT_PREFERENCES },
      profile: { ...DEFAULT_PROFILE },
      featureToggles: { ...DEFAULT_FEATURE_TOGGLES },
    }
  }

  return {
    chatbot: {
      tone: record.chatbotTone,
      autoSuggestActions: record.autoSuggestActions,
      enableProactive: record.enableProactive,
      preferredContactTime: record.preferredContactTime,
      aiInsightsFrequency: record.aiInsightsFrequency,
      insightPriorityThreshold: (record as any).insightPriorityThreshold ?? 'all',
      insightTypes: (record as any).insightTypes ?? ['lead_followup', 'scoring_accuracy', 'email_performance', 'pipeline_health'],
      customInstructions: record.customInstructions,
    },
    composer: mapRecordToPreferences(record),
    profile: {
      brandGuidelines: record.brandGuidelines,
      businessContext: record.businessContext,
      defaultEmailStructure: record.defaultEmailStructure,
      propertyDescStyle: record.propertyDescStyle,
      socialMediaPrefs: record.socialMediaPrefs as Record<string, unknown> | null,
      enhancementLevel: record.enhancementLevel,
    },
    featureToggles: {
      enableLeadScoring: record.enableLeadScoring,
      enableCompose: record.enableCompose,
      enableContentGen: record.enableContentGen,
      enableMessageEnhancer: record.enableMessageEnhancer,
      enableTemplateAI: record.enableTemplateAI,
      enableInsights: record.enableInsights,
    },
  }
}

/**
 * Save all AI settings (profile, composer, chatbot, toggles) in a single call
 */
export async function saveAllAIPreferences(
  userId: string,
  preferences: Partial<FullAIPreferences>,
  organizationId?: string
): Promise<FullAIPreferences> {
  let orgId = organizationId
  if (!orgId) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { organizationId: true } })
    orgId = user?.organizationId || ''
  }

  const updateData: Record<string, unknown> = {}

  // Map chatbot preferences
  if (preferences.chatbot) {
    if (preferences.chatbot.tone !== undefined) updateData.chatbotTone = preferences.chatbot.tone
    if (preferences.chatbot.autoSuggestActions !== undefined) updateData.autoSuggestActions = preferences.chatbot.autoSuggestActions
    if (preferences.chatbot.enableProactive !== undefined) updateData.enableProactive = preferences.chatbot.enableProactive
    if (preferences.chatbot.preferredContactTime !== undefined) updateData.preferredContactTime = preferences.chatbot.preferredContactTime
    if (preferences.chatbot.aiInsightsFrequency !== undefined) updateData.aiInsightsFrequency = preferences.chatbot.aiInsightsFrequency
    if (preferences.chatbot.insightPriorityThreshold !== undefined) updateData.insightPriorityThreshold = preferences.chatbot.insightPriorityThreshold
    if (preferences.chatbot.insightTypes !== undefined) updateData.insightTypes = preferences.chatbot.insightTypes
    if (preferences.chatbot.customInstructions !== undefined) updateData.customInstructions = preferences.chatbot.customInstructions
  }

  // Map composer preferences
  if (preferences.composer) {
    if (preferences.composer.defaultTone !== undefined) updateData.composerDefaultTone = preferences.composer.defaultTone
    if (preferences.composer.defaultLength !== undefined) updateData.composerDefaultLength = preferences.composer.defaultLength
    if (preferences.composer.defaultCTA !== undefined) updateData.composerDefaultCTA = preferences.composer.defaultCTA
    if (preferences.composer.defaultPersonalization !== undefined) updateData.composerDefaultPersonalization = preferences.composer.defaultPersonalization
    if (preferences.composer.autoGenerate !== undefined) updateData.composerAutoGenerate = preferences.composer.autoGenerate
    if (preferences.composer.showAdvanced !== undefined) updateData.composerShowAdvanced = preferences.composer.showAdvanced
  }

  // Map profile preferences
  if (preferences.profile) {
    if (preferences.profile.brandGuidelines !== undefined) updateData.brandGuidelines = preferences.profile.brandGuidelines
    if (preferences.profile.businessContext !== undefined) updateData.businessContext = preferences.profile.businessContext
    if (preferences.profile.defaultEmailStructure !== undefined) updateData.defaultEmailStructure = preferences.profile.defaultEmailStructure
    if (preferences.profile.propertyDescStyle !== undefined) updateData.propertyDescStyle = preferences.profile.propertyDescStyle
    if (preferences.profile.socialMediaPrefs !== undefined) updateData.socialMediaPrefs = preferences.profile.socialMediaPrefs
    if (preferences.profile.enhancementLevel !== undefined) updateData.enhancementLevel = preferences.profile.enhancementLevel
  }

  // Map feature toggles
  if (preferences.featureToggles) {
    if (preferences.featureToggles.enableLeadScoring !== undefined) updateData.enableLeadScoring = preferences.featureToggles.enableLeadScoring
    if (preferences.featureToggles.enableCompose !== undefined) updateData.enableCompose = preferences.featureToggles.enableCompose
    if (preferences.featureToggles.enableContentGen !== undefined) updateData.enableContentGen = preferences.featureToggles.enableContentGen
    if (preferences.featureToggles.enableMessageEnhancer !== undefined) updateData.enableMessageEnhancer = preferences.featureToggles.enableMessageEnhancer
    if (preferences.featureToggles.enableTemplateAI !== undefined) updateData.enableTemplateAI = preferences.featureToggles.enableTemplateAI
    if (preferences.featureToggles.enableInsights !== undefined) updateData.enableInsights = preferences.featureToggles.enableInsights
  }

  await prisma.userAIPreferences.upsert({
    where: { userId },
    create: {
      userId,
      organizationId: orgId,
      ...updateData,
    },
    update: updateData,
  })

  return getFullAIPreferences(userId)
}

/**
 * Update chatbot-specific preferences
 */
export async function saveChatbotPreferences(
  userId: string,
  preferences: {
    chatbotTone?: string
    autoSuggestActions?: boolean
    enableProactive?: boolean
    preferredContactTime?: string | null
    aiInsightsFrequency?: string
    customInstructions?: string | null
  },
  organizationId?: string
): Promise<void> {
  let orgId = organizationId
  if (!orgId) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { organizationId: true } })
    orgId = user?.organizationId || ''
  }

  await prisma.userAIPreferences.upsert({
    where: { userId },
    create: {
      userId,
      organizationId: orgId,
      chatbotTone: preferences.chatbotTone ?? 'professional',
      autoSuggestActions: preferences.autoSuggestActions ?? true,
      enableProactive: preferences.enableProactive ?? true,
      preferredContactTime: preferences.preferredContactTime ?? null,
      aiInsightsFrequency: preferences.aiInsightsFrequency ?? 'daily',
      customInstructions: preferences.customInstructions ?? null,
    },
    update: {
      ...(preferences.chatbotTone !== undefined && { chatbotTone: preferences.chatbotTone }),
      ...(preferences.autoSuggestActions !== undefined && { autoSuggestActions: preferences.autoSuggestActions }),
      ...(preferences.enableProactive !== undefined && { enableProactive: preferences.enableProactive }),
      ...(preferences.preferredContactTime !== undefined && { preferredContactTime: preferences.preferredContactTime }),
      ...(preferences.aiInsightsFrequency !== undefined && { aiInsightsFrequency: preferences.aiInsightsFrequency }),
      ...(preferences.customInstructions !== undefined && { customInstructions: preferences.customInstructions }),
    },
  })
}

// -- Internal helper --

function mapRecordToPreferences(record: {
  composerDefaultTone: string
  composerDefaultLength: string
  composerDefaultCTA: boolean
  composerDefaultPersonalization: string
  composerAutoGenerate: boolean
  composerShowAdvanced: boolean
}): ComposerPreferences {
  return {
    defaultTone: record.composerDefaultTone,
    defaultLength: record.composerDefaultLength,
    defaultCTA: record.composerDefaultCTA,
    defaultPersonalization: record.composerDefaultPersonalization,
    autoGenerate: record.composerAutoGenerate,
    showAdvanced: record.composerShowAdvanced,
  }
}
