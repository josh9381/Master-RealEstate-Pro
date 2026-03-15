/**
 * AI Settings Controller (Phase 3C)
 * Org admins manage their AI configuration:
 * - Set default tone, system prompt
 * - Paste their own OpenAI API key
 * - Choose AI model preference
 * - Set monthly token budget
 */

import { Request, Response } from 'express'
import { getOrgAISettings, updateOrgAISettings } from '../../services/ai-config.service'

/**
 * GET /api/settings/ai
 * Get current org AI settings (masked API key)
 */
export const getAISettings = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId
    const settings = await getOrgAISettings(organizationId)

    res.json({
      success: true,
      data: settings,
    })
  } catch (error: any) {
    console.error('Get AI settings error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch AI settings',
      error: error.message,
    })
  }
}

/**
 * PUT /api/settings/ai
 * Update org AI settings
 */
export const updateAISettings = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId
    const {
      openaiApiKey,
      openaiOrgId,
      useOwnAIKey,
      aiSystemPrompt,
      aiDefaultTone,
      aiDefaultModel,
      aiMaxTokensPerRequest,
      aiMonthlyTokenBudget,
    } = req.body

    // Validate tone
    const validTones = ['professional', 'friendly', 'direct', 'coaching', 'casual']
    if (aiDefaultTone && !validTones.includes(aiDefaultTone)) {
      return res.status(400).json({
        success: false,
        message: `Invalid tone. Must be one of: ${validTones.join(', ')}`,
      })
    }

    // Validate max tokens
    if (aiMaxTokensPerRequest !== undefined && (aiMaxTokensPerRequest < 100 || aiMaxTokensPerRequest > 8000)) {
      return res.status(400).json({
        success: false,
        message: 'Max tokens per request must be between 100 and 8000',
      })
    }

    // Validate API key format (basic check)
    if (openaiApiKey && !openaiApiKey.startsWith('sk-')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OpenAI API key format. Keys should start with "sk-"',
      })
    }

    const updated = await updateOrgAISettings(organizationId, {
      openaiApiKey,
      openaiOrgId,
      useOwnAIKey,
      aiSystemPrompt,
      aiDefaultTone,
      aiDefaultModel,
      aiMaxTokensPerRequest,
      aiMonthlyTokenBudget,
    })

    res.json({
      success: true,
      data: updated,
      message: 'AI settings updated successfully',
    })
  } catch (error: any) {
    console.error('Update AI settings error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to update AI settings',
      error: error.message,
    })
  }
}

/**
 * DELETE /api/settings/ai/key
 * Remove the org's own API key (revert to platform key)
 */
export const removeAPIKey = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId

    await updateOrgAISettings(organizationId, {
      openaiApiKey: undefined,
      useOwnAIKey: false,
    })

    res.json({
      success: true,
      message: 'API key removed. Your organization will use the platform AI key.',
    })
  } catch (error: any) {
    console.error('Remove API key error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to remove API key',
      error: error.message,
    })
  }
}
