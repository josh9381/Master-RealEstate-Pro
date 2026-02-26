import prisma from '../config/database'

/**
 * Lead Scoring Algorithm
 * 
 * Scoring Factors:
 * - Email Opens: +5 points each
 * - Email Clicks: +10 points each
 * - Email Replies: +15 points each
 * - Form Submissions: +20 points each
 * - Property Inquiries: +25 points each
 * - Scheduled Appointments: +30 points each
 * - Completed Appointments: +40 points each
 * - Recency: Higher scores for recent activity
 * - Frequency: Bonus for consistent engagement
 * - Email Opt-Out: -50 points
 * 
 * Score Ranges:
 * - Hot (75-100): Highly engaged, ready to convert
 * - Warm (50-74): Showing interest, needs nurturing
 * - Cool (25-49): Some engagement, long-term nurture
 * - Cold (0-24): Minimal engagement, may need re-engagement campaign
 */

interface ScoringFactors {
  emailOpens: number
  emailClicks: number
  emailReplies: number
  formSubmissions: number
  propertyInquiries: number
  scheduledAppointments: number
  completedAppointments: number
  daysSinceLastActivity: number
  activityFrequency: number
  emailOptedOut: boolean
}

const SCORE_WEIGHTS = {
  EMAIL_OPEN: 5,
  EMAIL_CLICK: 10,
  EMAIL_REPLY: 15,
  FORM_SUBMISSION: 20,
  PROPERTY_INQUIRY: 25,
  SCHEDULED_APPOINTMENT: 30,
  COMPLETED_APPOINTMENT: 40,
  EMAIL_OPT_OUT: -50,
  RECENCY_BONUS_MAX: 20, // Max bonus for recent activity
  FREQUENCY_BONUS_MAX: 15, // Max bonus for consistent engagement
}

/**
 * Calculate lead score based on engagement factors
 */
export function calculateLeadScore(factors: ScoringFactors): number {
  let score = 0

  // Base engagement scores
  score += factors.emailOpens * SCORE_WEIGHTS.EMAIL_OPEN
  score += factors.emailClicks * SCORE_WEIGHTS.EMAIL_CLICK
  score += factors.emailReplies * SCORE_WEIGHTS.EMAIL_REPLY
  score += factors.formSubmissions * SCORE_WEIGHTS.FORM_SUBMISSION
  score += factors.propertyInquiries * SCORE_WEIGHTS.PROPERTY_INQUIRY
  score += factors.scheduledAppointments * SCORE_WEIGHTS.SCHEDULED_APPOINTMENT
  score += factors.completedAppointments * SCORE_WEIGHTS.COMPLETED_APPOINTMENT

  // Recency bonus (decays over time)
  // Recent activity (0-7 days): +20 points
  // Medium recent (8-30 days): +10 points
  // Older (31-90 days): +5 points
  // Very old (90+ days): +0 points
  if (factors.daysSinceLastActivity <= 7) {
    score += SCORE_WEIGHTS.RECENCY_BONUS_MAX
  } else if (factors.daysSinceLastActivity <= 30) {
    score += SCORE_WEIGHTS.RECENCY_BONUS_MAX / 2
  } else if (factors.daysSinceLastActivity <= 90) {
    score += SCORE_WEIGHTS.RECENCY_BONUS_MAX / 4
  }

  // Frequency bonus (consistent engagement)
  // Frequency is measured as activities per week
  // High frequency (5+ per week): +15 points
  // Medium frequency (2-4 per week): +10 points
  // Low frequency (1 per week): +5 points
  if (factors.activityFrequency >= 5) {
    score += SCORE_WEIGHTS.FREQUENCY_BONUS_MAX
  } else if (factors.activityFrequency >= 2) {
    score += SCORE_WEIGHTS.FREQUENCY_BONUS_MAX * 0.67
  } else if (factors.activityFrequency >= 1) {
    score += SCORE_WEIGHTS.FREQUENCY_BONUS_MAX * 0.33
  }

  // Email opt-out penalty
  if (factors.emailOptedOut) {
    score += SCORE_WEIGHTS.EMAIL_OPT_OUT
  }

  // Ensure score is between 0 and 100
  return Math.max(0, Math.min(100, Math.round(score)))
}

/**
 * Get scoring factors for a lead from database
 */
async function getLeadScoringFactors(leadId: string): Promise<ScoringFactors> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      messages: {
        where: {
          createdAt: {
            gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Last 90 days
          },
        },
      },
      activities: {
        where: {
          createdAt: {
            gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Last 90 days
          },
        },
      },
      appointments: {
        where: {
          createdAt: {
            gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Last 90 days
          },
        },
      },
    },
  })

  if (!lead) {
    throw new Error(`Lead not found: ${leadId}`)
  }

  // Count email interactions based on Activity types
  let emailOpens = 0
  let emailClicks = 0
  let emailReplies = 0

  // Count from messages
  for (const message of lead.messages) {
    if (message.readAt) {
      emailOpens++
    }
    if (message.repliedAt) {
      emailReplies++
    }
    // Check metadata for link clicks
    const metadata = message.metadata as Record<string, unknown> | null
    if (metadata && (metadata.clicked || metadata.linkClicked)) {
      emailClicks++
    }
  }

  // Count from activities
  for (const activity of lead.activities) {
    if (activity.type === 'EMAIL_OPENED') {
      emailOpens++
    } else if (activity.type === 'EMAIL_CLICKED') {
      emailClicks++
    }
  }

  // For now, use note activity as proxy for form submissions and property inquiries
  // In a real implementation, these would be tracked in custom fields or separate models
  const formSubmissions = 0
  const propertyInquiries = 0

  // Count appointments
  const scheduledAppointments = lead.appointments.filter(
    (apt) => apt.status === 'SCHEDULED' || apt.status === 'CONFIRMED'
  ).length

  const completedAppointments = lead.appointments.filter(
    (apt) => apt.status === 'COMPLETED'
  ).length

  // Calculate recency (days since last activity)
  const allDates = [
    ...lead.messages.map((m) => m.createdAt),
    ...lead.activities.map((a) => a.createdAt),
    ...lead.appointments.map((a) => a.createdAt),
  ]

  let daysSinceLastActivity = 365 // Default to 1 year if no activity

  if (allDates.length > 0) {
    const mostRecentDate = new Date(Math.max(...allDates.map((d) => d.getTime())))
    const daysDiff = Math.floor(
      (Date.now() - mostRecentDate.getTime()) / (1000 * 60 * 60 * 24)
    )
    daysSinceLastActivity = daysDiff
  }

  // Calculate frequency (activities per week) using actual activity time span
  const totalActivities = lead.messages.length + lead.activities.length + lead.appointments.length
  let daysSinceOldestActivity = daysSinceLastActivity
  if (allDates.length > 0) {
    const oldestDate = new Date(Math.min(...allDates.map((d) => d.getTime())))
    daysSinceOldestActivity = Math.floor(
      (Date.now() - oldestDate.getTime()) / (1000 * 60 * 60 * 24)
    )
  }
  const weeksSinceOldestActivity = Math.max(1, daysSinceOldestActivity / 7)
  const activityFrequency = totalActivities / weeksSinceOldestActivity

  // Get emailOptIn status (cast to any to access the field that was just added in migration)
  const emailOptIn = (lead as unknown as { emailOptIn: boolean }).emailOptIn ?? true

  return {
    emailOpens,
    emailClicks,
    emailReplies,
    formSubmissions,
    propertyInquiries,
    scheduledAppointments,
    completedAppointments,
    daysSinceLastActivity,
    activityFrequency,
    emailOptedOut: !emailOptIn,
  }
}

/**
 * Get detailed score factor breakdown for a lead
 * Returns each component's contribution to the final score
 */
export async function getLeadScoreBreakdown(leadId: string) {
  const factors = await getLeadScoringFactors(leadId)

  // Check for org-level scoring config
  const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { organizationId: true, score: true } })
  let weights = { ...SCORE_WEIGHTS }
  if (lead) {
    const orgConfig = await prisma.scoringConfig.findUnique({
      where: { organizationId: lead.organizationId },
    })
    if (orgConfig) {
      weights = {
        EMAIL_OPEN: orgConfig.emailOpenWeight,
        EMAIL_CLICK: orgConfig.emailClickWeight,
        EMAIL_REPLY: orgConfig.emailReplyWeight,
        FORM_SUBMISSION: orgConfig.formSubmissionWeight,
        PROPERTY_INQUIRY: orgConfig.propertyInquiryWeight,
        SCHEDULED_APPOINTMENT: orgConfig.scheduledApptWeight,
        COMPLETED_APPOINTMENT: orgConfig.completedApptWeight,
        EMAIL_OPT_OUT: orgConfig.emailOptOutPenalty,
        RECENCY_BONUS_MAX: orgConfig.recencyBonusMax,
        FREQUENCY_BONUS_MAX: orgConfig.frequencyBonusMax,
      }
    }
  }

  // Calculate each component
  const components = [
    { name: 'Email Opens', count: factors.emailOpens, weight: weights.EMAIL_OPEN, points: factors.emailOpens * weights.EMAIL_OPEN },
    { name: 'Email Clicks', count: factors.emailClicks, weight: weights.EMAIL_CLICK, points: factors.emailClicks * weights.EMAIL_CLICK },
    { name: 'Email Replies', count: factors.emailReplies, weight: weights.EMAIL_REPLY, points: factors.emailReplies * weights.EMAIL_REPLY },
    { name: 'Form Submissions', count: factors.formSubmissions, weight: weights.FORM_SUBMISSION, points: factors.formSubmissions * weights.FORM_SUBMISSION },
    { name: 'Property Inquiries', count: factors.propertyInquiries, weight: weights.PROPERTY_INQUIRY, points: factors.propertyInquiries * weights.PROPERTY_INQUIRY },
    { name: 'Scheduled Appointments', count: factors.scheduledAppointments, weight: weights.SCHEDULED_APPOINTMENT, points: factors.scheduledAppointments * weights.SCHEDULED_APPOINTMENT },
    { name: 'Completed Appointments', count: factors.completedAppointments, weight: weights.COMPLETED_APPOINTMENT, points: factors.completedAppointments * weights.COMPLETED_APPOINTMENT },
  ]

  // Recency bonus
  let recencyPoints = 0
  let recencyLabel = 'Very old (90+ days)'
  if (factors.daysSinceLastActivity <= 7) {
    recencyPoints = weights.RECENCY_BONUS_MAX
    recencyLabel = 'Very recent (0-7 days)'
  } else if (factors.daysSinceLastActivity <= 30) {
    recencyPoints = weights.RECENCY_BONUS_MAX / 2
    recencyLabel = 'Recent (8-30 days)'
  } else if (factors.daysSinceLastActivity <= 90) {
    recencyPoints = weights.RECENCY_BONUS_MAX / 4
    recencyLabel = 'Moderate (31-90 days)'
  }
  components.push({ name: 'Activity Recency', count: 1, weight: recencyPoints, points: recencyPoints })

  // Frequency bonus
  let frequencyPoints = 0
  if (factors.activityFrequency >= 5) {
    frequencyPoints = weights.FREQUENCY_BONUS_MAX
  } else if (factors.activityFrequency >= 2) {
    frequencyPoints = weights.FREQUENCY_BONUS_MAX * 0.67
  } else if (factors.activityFrequency >= 1) {
    frequencyPoints = weights.FREQUENCY_BONUS_MAX * 0.33
  }
  components.push({ name: 'Engagement Frequency', count: 1, weight: frequencyPoints, points: frequencyPoints })

  // Email opt-out penalty
  if (factors.emailOptedOut) {
    components.push({ name: 'Email Opt-Out Penalty', count: 1, weight: weights.EMAIL_OPT_OUT, points: weights.EMAIL_OPT_OUT })
  }

  const rawTotal = components.reduce((sum, c) => sum + c.points, 0)
  const finalScore = Math.max(0, Math.min(100, Math.round(rawTotal)))

  return {
    leadId,
    finalScore,
    currentScore: lead?.score ?? finalScore,
    rawTotal: Math.round(rawTotal * 10) / 10,
    factors: {
      emailOpens: factors.emailOpens,
      emailClicks: factors.emailClicks,
      emailReplies: factors.emailReplies,
      formSubmissions: factors.formSubmissions,
      propertyInquiries: factors.propertyInquiries,
      scheduledAppointments: factors.scheduledAppointments,
      completedAppointments: factors.completedAppointments,
      daysSinceLastActivity: factors.daysSinceLastActivity,
      activityFrequency: Math.round(factors.activityFrequency * 100) / 100,
      emailOptedOut: factors.emailOptedOut,
    },
    components: components.filter(c => c.points !== 0),
    recencyLabel,
  }
}

/**
 * Update lead score in database
 * NOW ACCEPTS userId TO USE PERSONALIZED WEIGHTS
 */
export async function updateLeadScore(leadId: string, userId?: string): Promise<number> {
  const factors = await getLeadScoringFactors(leadId)
  
  // Get org-level scoring config or user-specific weights
  let customWeights: typeof SCORE_WEIGHTS | null = null;

  // First check for org-level ScoringConfig
  const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { organizationId: true } });
  if (lead) {
    const orgConfig = await prisma.scoringConfig.findUnique({
      where: { organizationId: lead.organizationId },
    });
    if (orgConfig) {
      customWeights = {
        EMAIL_OPEN: orgConfig.emailOpenWeight,
        EMAIL_CLICK: orgConfig.emailClickWeight,
        EMAIL_REPLY: orgConfig.emailReplyWeight,
        FORM_SUBMISSION: orgConfig.formSubmissionWeight,
        PROPERTY_INQUIRY: orgConfig.propertyInquiryWeight,
        SCHEDULED_APPOINTMENT: orgConfig.scheduledApptWeight,
        COMPLETED_APPOINTMENT: orgConfig.completedApptWeight,
        EMAIL_OPT_OUT: orgConfig.emailOptOutPenalty,
        RECENCY_BONUS_MAX: orgConfig.recencyBonusMax,
        FREQUENCY_BONUS_MAX: orgConfig.frequencyBonusMax,
      };
      console.log(`📊 Using org-level scoring config for lead ${leadId}`);
    }
  }

  // User-specific weights override org-level config
  if (userId) {
    const scoringModel = await prisma.leadScoringModel.findUnique({
      where: { userId },
    });
    
    if (scoringModel && scoringModel.factors) {
      const raw = scoringModel.factors as Record<string, unknown>;
      // Validate and extract weights with safe defaults
      const activityWeight = typeof raw.activityWeight === 'number' && raw.activityWeight > 0 ? raw.activityWeight : 0.3;
      const recencyWeight = typeof raw.recencyWeight === 'number' && raw.recencyWeight > 0 ? raw.recencyWeight : 0.2;
      // Convert normalized weights (0-1) to score multipliers
      const activityScale = activityWeight / 0.3;
      const recencyScale = recencyWeight / 0.2;
      customWeights = {
        ...SCORE_WEIGHTS,
        EMAIL_OPEN: SCORE_WEIGHTS.EMAIL_OPEN * activityScale,
        EMAIL_CLICK: SCORE_WEIGHTS.EMAIL_CLICK * activityScale,
        EMAIL_REPLY: SCORE_WEIGHTS.EMAIL_REPLY * activityScale,
        FORM_SUBMISSION: SCORE_WEIGHTS.FORM_SUBMISSION * activityScale,
        PROPERTY_INQUIRY: SCORE_WEIGHTS.PROPERTY_INQUIRY * activityScale,
        SCHEDULED_APPOINTMENT: SCORE_WEIGHTS.SCHEDULED_APPOINTMENT * activityScale,
        COMPLETED_APPOINTMENT: SCORE_WEIGHTS.COMPLETED_APPOINTMENT * activityScale,
        EMAIL_OPT_OUT: SCORE_WEIGHTS.EMAIL_OPT_OUT * activityScale,
        RECENCY_BONUS_MAX: SCORE_WEIGHTS.RECENCY_BONUS_MAX * recencyScale,
        FREQUENCY_BONUS_MAX: SCORE_WEIGHTS.FREQUENCY_BONUS_MAX * activityScale,
      };
      console.log(`📊 Using personalized scoring weights for user ${userId}`);
    }
  }
  
  const score = customWeights ? calculateLeadScoreWithWeights(factors, customWeights) : calculateLeadScore(factors);

  await prisma.lead.update({
    where: { id: leadId },
    data: { score },
  });

  return score;
}

/**
 * Calculate lead score with custom weights (for personalized scoring)
 */
function calculateLeadScoreWithWeights(factors: ScoringFactors, weights: typeof SCORE_WEIGHTS): number {
  let score = 0;

  // Base engagement scores with custom weights
  score += factors.emailOpens * weights.EMAIL_OPEN;
  score += factors.emailClicks * weights.EMAIL_CLICK;
  score += factors.emailReplies * weights.EMAIL_REPLY;
  score += factors.formSubmissions * weights.FORM_SUBMISSION;
  score += factors.propertyInquiries * weights.PROPERTY_INQUIRY;
  score += factors.scheduledAppointments * weights.SCHEDULED_APPOINTMENT;
  score += factors.completedAppointments * weights.COMPLETED_APPOINTMENT;

  // Recency bonus with custom weight
  if (factors.daysSinceLastActivity <= 7) {
    score += weights.RECENCY_BONUS_MAX;
  } else if (factors.daysSinceLastActivity <= 30) {
    score += weights.RECENCY_BONUS_MAX / 2;
  } else if (factors.daysSinceLastActivity <= 90) {
    score += weights.RECENCY_BONUS_MAX / 4;
  }

  // Frequency bonus with custom weight
  if (factors.activityFrequency >= 5) {
    score += weights.FREQUENCY_BONUS_MAX;
  } else if (factors.activityFrequency >= 2) {
    score += weights.FREQUENCY_BONUS_MAX * 0.67;
  } else if (factors.activityFrequency >= 1) {
    score += weights.FREQUENCY_BONUS_MAX * 0.33;
  }

  // Email opt-out penalty
  if (factors.emailOptedOut) {
    score += weights.EMAIL_OPT_OUT;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Update scores for multiple leads
 * NOW SUPPORTS USER-SPECIFIC WEIGHTS
 */
export async function updateMultipleLeadScores(leadIds: string[], userId?: string): Promise<void> {
  const updates = leadIds.map((leadId) => updateLeadScore(leadId, userId))
  await Promise.all(updates)
}

/**
 * Update scores for all leads (batch processing)
 * NOW UPDATES EACH USER'S LEADS WITH THEIR PERSONALIZED WEIGHTS
 */
export async function updateAllLeadScores(): Promise<{ updated: number; errors: number }> {
  console.log('🔄 Starting bulk lead score update with per-user personalization...');

  // Get all users with scoring models
  const usersWithModels = await prisma.leadScoringModel.findMany({
    select: { userId: true },
  });

  let updated = 0;
  let errors = 0;

  // Update leads for each user with their personalized weights
  for (const { userId } of usersWithModels) {
    const userLeads = await prisma.lead.findMany({
      where: { assignedToId: userId },
      select: { id: true },
    });

    if (userLeads.length > 0) {
      console.log(`📊 Updating ${userLeads.length} leads for user ${userId} with personalized weights...`);
      
      // Process in batches of 50
      const batchSize = 50;
      for (let i = 0; i < userLeads.length; i += batchSize) {
        const batch = userLeads.slice(i, i + batchSize);
        const results = await Promise.allSettled(
          batch.map((lead) => updateLeadScore(lead.id, userId))
        );

        results.forEach((result) => {
          if (result.status === 'fulfilled') {
            updated++;
          } else {
            errors++;
          }
        });
      }
    }
  }

  // Also update leads for users without models (using default weights)
  const leadsWithoutPersonalizedScoring = await prisma.lead.findMany({
    where: {
      OR: [
        { assignedToId: null },
        {
          assignedToId: {
            notIn: usersWithModels.map(u => u.userId),
          },
        },
      ],
    },
    select: { id: true },
  });

  if (leadsWithoutPersonalizedScoring.length > 0) {
    console.log(`📊 Updating ${leadsWithoutPersonalizedScoring.length} leads with default weights...`);
    
    const batchSize = 50;
    for (let i = 0; i < leadsWithoutPersonalizedScoring.length; i += batchSize) {
      const batch = leadsWithoutPersonalizedScoring.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map((lead) => updateLeadScore(lead.id))
      );

      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          updated++;
        } else {
          errors++;
        }
      });
    }
  }

  console.log(`✅ Bulk update complete: ${updated} leads updated, ${errors} errors`);
  return { updated, errors };
}

/**
 * Get score category (Hot, Warm, Cool, Cold)
 */
export function getScoreCategory(score: number): 'HOT' | 'WARM' | 'COOL' | 'COLD' {
  if (score >= 75) return 'HOT'
  if (score >= 50) return 'WARM'
  if (score >= 25) return 'COOL'
  return 'COLD'
}

/**
 * Get leads by score category
 */
export async function getLeadsByScoreCategory(
  category: 'HOT' | 'WARM' | 'COOL' | 'COLD'
): Promise<Array<Record<string, unknown>>> {
  let minScore = 0
  let maxScore = 100

  switch (category) {
    case 'HOT':
      minScore = 75
      break
    case 'WARM':
      minScore = 50
      maxScore = 74
      break
    case 'COOL':
      minScore = 25
      maxScore = 49
      break
    case 'COLD':
      maxScore = 24
      break
  }

  return prisma.lead.findMany({
    where: {
      score: {
        gte: minScore,
        lte: maxScore,
      },
    },
    orderBy: {
      score: 'desc',
    },
  })
}
