import { Request, Response } from 'express'
import prisma from '../config/database'

const DEFAULT_WEIGHTS = {
  engagement: 30,
  demographic: 25,
  behavior: 25,
  timing: 20,
}

const DEFAULT_CONFIG = {
  weights: DEFAULT_WEIGHTS,
  emailOpenWeight: 5,
  emailClickWeight: 10,
  emailReplyWeight: 15,
  formSubmissionWeight: 20,
  propertyInquiryWeight: 25,
  scheduledApptWeight: 30,
  completedApptWeight: 40,
  emailOptOutPenalty: -50,
  recencyBonusMax: 20,
  frequencyBonusMax: 15,
}

/**
 * GET /api/ai/scoring-config
 * Returns the org's scoring configuration, or defaults if none saved
 */
export const getScoringConfig = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId

    const config = await prisma.scoringConfig.findUnique({
      where: { organizationId },
      include: {
        updatedBy: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    })

    if (!config) {
      return res.json({
        success: true,
        data: {
          ...DEFAULT_CONFIG,
          isDefault: true,
          updatedAt: null,
          updatedBy: null,
        },
      })
    }

    res.json({
      success: true,
      data: {
        id: config.id,
        weights: config.weights,
        emailOpenWeight: config.emailOpenWeight,
        emailClickWeight: config.emailClickWeight,
        emailReplyWeight: config.emailReplyWeight,
        formSubmissionWeight: config.formSubmissionWeight,
        propertyInquiryWeight: config.propertyInquiryWeight,
        scheduledApptWeight: config.scheduledApptWeight,
        completedApptWeight: config.completedApptWeight,
        emailOptOutPenalty: config.emailOptOutPenalty,
        recencyBonusMax: config.recencyBonusMax,
        frequencyBonusMax: config.frequencyBonusMax,
        isDefault: false,
        updatedAt: config.updatedAt,
        updatedBy: config.updatedBy
          ? `${config.updatedBy.firstName} ${config.updatedBy.lastName}`
          : null,
      },
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch scoring configuration',
      error: error.message,
    })
  }
}

/**
 * PUT /api/ai/scoring-config
 * Create or update the org's scoring configuration
 */
export const updateScoringConfig = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId
    const userId = req.user!.userId

    const {
      weights,
      emailOpenWeight,
      emailClickWeight,
      emailReplyWeight,
      formSubmissionWeight,
      propertyInquiryWeight,
      scheduledApptWeight,
      completedApptWeight,
      emailOptOutPenalty,
      recencyBonusMax,
      frequencyBonusMax,
    } = req.body

    const config = await prisma.scoringConfig.upsert({
      where: { organizationId },
      create: {
        organizationId,
        weights: weights || DEFAULT_WEIGHTS,
        emailOpenWeight: emailOpenWeight ?? DEFAULT_CONFIG.emailOpenWeight,
        emailClickWeight: emailClickWeight ?? DEFAULT_CONFIG.emailClickWeight,
        emailReplyWeight: emailReplyWeight ?? DEFAULT_CONFIG.emailReplyWeight,
        formSubmissionWeight: formSubmissionWeight ?? DEFAULT_CONFIG.formSubmissionWeight,
        propertyInquiryWeight: propertyInquiryWeight ?? DEFAULT_CONFIG.propertyInquiryWeight,
        scheduledApptWeight: scheduledApptWeight ?? DEFAULT_CONFIG.scheduledApptWeight,
        completedApptWeight: completedApptWeight ?? DEFAULT_CONFIG.completedApptWeight,
        emailOptOutPenalty: emailOptOutPenalty ?? DEFAULT_CONFIG.emailOptOutPenalty,
        recencyBonusMax: recencyBonusMax ?? DEFAULT_CONFIG.recencyBonusMax,
        frequencyBonusMax: frequencyBonusMax ?? DEFAULT_CONFIG.frequencyBonusMax,
        updatedById: userId,
      },
      update: {
        ...(weights !== undefined && { weights }),
        ...(emailOpenWeight !== undefined && { emailOpenWeight }),
        ...(emailClickWeight !== undefined && { emailClickWeight }),
        ...(emailReplyWeight !== undefined && { emailReplyWeight }),
        ...(formSubmissionWeight !== undefined && { formSubmissionWeight }),
        ...(propertyInquiryWeight !== undefined && { propertyInquiryWeight }),
        ...(scheduledApptWeight !== undefined && { scheduledApptWeight }),
        ...(completedApptWeight !== undefined && { completedApptWeight }),
        ...(emailOptOutPenalty !== undefined && { emailOptOutPenalty }),
        ...(recencyBonusMax !== undefined && { recencyBonusMax }),
        ...(frequencyBonusMax !== undefined && { frequencyBonusMax }),
        updatedById: userId,
      },
    })

    res.json({
      success: true,
      data: config,
      message: 'Scoring configuration updated',
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to update scoring configuration',
      error: error.message,
    })
  }
}

/**
 * POST /api/ai/scoring-config/reset
 * Reset scoring config to defaults
 */
export const resetScoringConfig = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId

    await prisma.scoringConfig.deleteMany({
      where: { organizationId },
    })

    res.json({
      success: true,
      data: {
        ...DEFAULT_CONFIG,
        isDefault: true,
        updatedAt: null,
        updatedBy: null,
      },
      message: 'Scoring configuration reset to defaults',
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to reset scoring configuration',
      error: error.message,
    })
  }
}
