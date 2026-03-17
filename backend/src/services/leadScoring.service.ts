import { logger } from '../lib/logger'
import prisma from '../config/database'
import { roundTo2 } from '../utils/metricsCalculator'

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
  // Profile completeness factors (Phase 1)
  hasEmail: boolean
  hasPhone: boolean
  hasCompany: boolean
  hasDealValue: boolean
  dealValueAbove500k: boolean
  hasPropertyType: boolean
  hasBudget: boolean
  hasBedsOrBaths: boolean
  hasBeenContacted: boolean
  contactedInLast7Days: boolean
  contactedInLast30Days: boolean
  hasNotes: boolean
  activityCount: number
  statusProgression: string
  hasTags: boolean
  emailOptIn: boolean
  smsOptIn: boolean
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
  // Profile completeness factors (Phase 1)
  HAS_EMAIL: 5,
  HAS_PHONE: 5,
  HAS_COMPANY: 5,
  HAS_DEAL_VALUE: 10,
  DEAL_VALUE_ABOVE_500K: 5,
  HAS_PROPERTY_TYPE: 5,
  HAS_BUDGET: 5,
  HAS_BEDS_BATHS: 5,
  HAS_BEEN_CONTACTED: 10,
  CONTACTED_LAST_7_DAYS: 5,
  CONTACTED_LAST_30_DAYS: 3,
  HAS_NOTES: 5,
  ACTIVITIES_ABOVE_5: 5,
  ACTIVITIES_ABOVE_10: 10,
  STATUS_CONTACTED: 5,
  STATUS_QUALIFIED: 10,
  STATUS_PROPOSAL: 15,
  STATUS_NEGOTIATION: 20,
  HAS_TAGS: 3,
  EMAIL_OPT_IN: 2,
  SMS_OPT_IN: 2,
}

/**
 * Calculate lead score based on engagement factors
 */
export function calculateLeadScore(factors: ScoringFactors): number {
  let score = 0

  // Profile completeness factors (Phase 1 - available from existing data)
  if (factors.hasEmail) score += SCORE_WEIGHTS.HAS_EMAIL
  if (factors.hasPhone) score += SCORE_WEIGHTS.HAS_PHONE
  if (factors.hasCompany) score += SCORE_WEIGHTS.HAS_COMPANY
  if (factors.hasDealValue) score += SCORE_WEIGHTS.HAS_DEAL_VALUE
  if (factors.dealValueAbove500k) score += SCORE_WEIGHTS.DEAL_VALUE_ABOVE_500K
  if (factors.hasPropertyType) score += SCORE_WEIGHTS.HAS_PROPERTY_TYPE
  if (factors.hasBudget) score += SCORE_WEIGHTS.HAS_BUDGET
  if (factors.hasBedsOrBaths) score += SCORE_WEIGHTS.HAS_BEDS_BATHS
  if (factors.hasBeenContacted) score += SCORE_WEIGHTS.HAS_BEEN_CONTACTED
  if (factors.contactedInLast7Days) score += SCORE_WEIGHTS.CONTACTED_LAST_7_DAYS
  else if (factors.contactedInLast30Days) score += SCORE_WEIGHTS.CONTACTED_LAST_30_DAYS
  if (factors.hasNotes) score += SCORE_WEIGHTS.HAS_NOTES
  if (factors.activityCount > 10) score += SCORE_WEIGHTS.ACTIVITIES_ABOVE_10
  else if (factors.activityCount > 5) score += SCORE_WEIGHTS.ACTIVITIES_ABOVE_5

  // Status progression
  const status = factors.statusProgression?.toUpperCase()
  if (status === 'CONTACTED') score += SCORE_WEIGHTS.STATUS_CONTACTED
  else if (status === 'QUALIFIED') score += SCORE_WEIGHTS.STATUS_QUALIFIED
  else if (status === 'PROPOSAL') score += SCORE_WEIGHTS.STATUS_PROPOSAL
  else if (status === 'NEGOTIATION') score += SCORE_WEIGHTS.STATUS_NEGOTIATION

  if (factors.hasTags) score += SCORE_WEIGHTS.HAS_TAGS
  if (factors.emailOptIn) score += SCORE_WEIGHTS.EMAIL_OPT_IN
  if (factors.smsOptIn) score += SCORE_WEIGHTS.SMS_OPT_IN

  // Engagement-based scores
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
      notes: { select: { id: true } },
      tags: { select: { id: true } },
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
  const emailOptInVal = (lead as unknown as { emailOptIn: boolean }).emailOptIn ?? true
  const smsOptInVal = (lead as unknown as { smsOptIn: boolean }).smsOptIn ?? true

  // Profile completeness factors
  const now = Date.now()
  const lastContact = lead.lastContactAt ? new Date(lead.lastContactAt).getTime() : 0
  const daysSinceContact = lastContact > 0 ? Math.floor((now - lastContact) / (1000 * 60 * 60 * 24)) : Infinity

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
    emailOptedOut: !emailOptInVal,
    // Profile completeness
    hasEmail: !!lead.email,
    hasPhone: !!lead.phone,
    hasCompany: !!lead.company,
    hasDealValue: lead.value != null && lead.value > 0,
    dealValueAbove500k: lead.value != null && lead.value > 500000,
    hasPropertyType: !!lead.propertyType,
    hasBudget: lead.budgetMin != null || lead.budgetMax != null,
    hasBedsOrBaths: lead.bedsMin != null || lead.bathsMin != null,
    hasBeenContacted: !!lead.lastContactAt,
    contactedInLast7Days: daysSinceContact <= 7,
    contactedInLast30Days: daysSinceContact <= 30,
    hasNotes: lead.notes.length > 0,
    activityCount: totalActivities,
    statusProgression: lead.status,
    hasTags: lead.tags.length > 0,
    emailOptIn: emailOptInVal,
    smsOptIn: smsOptInVal,
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
        ...SCORE_WEIGHTS,
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
  // Profile completeness components
  const components: Array<{ name: string; count: number; weight: number; points: number }> = []

  if (factors.hasEmail) components.push({ name: 'Has Email', count: 1, weight: weights.HAS_EMAIL, points: weights.HAS_EMAIL })
  if (factors.hasPhone) components.push({ name: 'Has Phone', count: 1, weight: weights.HAS_PHONE, points: weights.HAS_PHONE })
  if (factors.hasCompany) components.push({ name: 'Has Company', count: 1, weight: weights.HAS_COMPANY, points: weights.HAS_COMPANY })
  if (factors.hasDealValue) components.push({ name: 'Has Deal Value', count: 1, weight: weights.HAS_DEAL_VALUE, points: weights.HAS_DEAL_VALUE })
  if (factors.dealValueAbove500k) components.push({ name: 'Deal Value > $500k', count: 1, weight: weights.DEAL_VALUE_ABOVE_500K, points: weights.DEAL_VALUE_ABOVE_500K })
  if (factors.hasPropertyType) components.push({ name: 'Has Property Type', count: 1, weight: weights.HAS_PROPERTY_TYPE, points: weights.HAS_PROPERTY_TYPE })
  if (factors.hasBudget) components.push({ name: 'Has Budget', count: 1, weight: weights.HAS_BUDGET, points: weights.HAS_BUDGET })
  if (factors.hasBedsOrBaths) components.push({ name: 'Has Beds/Baths', count: 1, weight: weights.HAS_BEDS_BATHS, points: weights.HAS_BEDS_BATHS })
  if (factors.hasBeenContacted) components.push({ name: 'Has Been Contacted', count: 1, weight: weights.HAS_BEEN_CONTACTED, points: weights.HAS_BEEN_CONTACTED })
  if (factors.contactedInLast7Days) components.push({ name: 'Contacted Last 7 Days', count: 1, weight: weights.CONTACTED_LAST_7_DAYS, points: weights.CONTACTED_LAST_7_DAYS })
  else if (factors.contactedInLast30Days) components.push({ name: 'Contacted Last 30 Days', count: 1, weight: weights.CONTACTED_LAST_30_DAYS, points: weights.CONTACTED_LAST_30_DAYS })
  if (factors.hasNotes) components.push({ name: 'Has Notes', count: 1, weight: weights.HAS_NOTES, points: weights.HAS_NOTES })
  if (factors.activityCount > 10) components.push({ name: 'Activities > 10', count: factors.activityCount, weight: weights.ACTIVITIES_ABOVE_10, points: weights.ACTIVITIES_ABOVE_10 })
  else if (factors.activityCount > 5) components.push({ name: 'Activities > 5', count: factors.activityCount, weight: weights.ACTIVITIES_ABOVE_5, points: weights.ACTIVITIES_ABOVE_5 })

  const status = factors.statusProgression?.toUpperCase()
  if (status === 'CONTACTED') components.push({ name: 'Status: Contacted', count: 1, weight: weights.STATUS_CONTACTED, points: weights.STATUS_CONTACTED })
  else if (status === 'QUALIFIED') components.push({ name: 'Status: Qualified', count: 1, weight: weights.STATUS_QUALIFIED, points: weights.STATUS_QUALIFIED })
  else if (status === 'PROPOSAL') components.push({ name: 'Status: Proposal', count: 1, weight: weights.STATUS_PROPOSAL, points: weights.STATUS_PROPOSAL })
  else if (status === 'NEGOTIATION') components.push({ name: 'Status: Negotiation', count: 1, weight: weights.STATUS_NEGOTIATION, points: weights.STATUS_NEGOTIATION })

  if (factors.hasTags) components.push({ name: 'Has Tags', count: 1, weight: weights.HAS_TAGS, points: weights.HAS_TAGS })
  if (factors.emailOptIn) components.push({ name: 'Email Opt-In', count: 1, weight: weights.EMAIL_OPT_IN, points: weights.EMAIL_OPT_IN })
  if (factors.smsOptIn) components.push({ name: 'SMS Opt-In', count: 1, weight: weights.SMS_OPT_IN, points: weights.SMS_OPT_IN })

  // Engagement components
  components.push(
    { name: 'Email Opens', count: factors.emailOpens, weight: weights.EMAIL_OPEN, points: factors.emailOpens * weights.EMAIL_OPEN },
    { name: 'Email Clicks', count: factors.emailClicks, weight: weights.EMAIL_CLICK, points: factors.emailClicks * weights.EMAIL_CLICK },
    { name: 'Email Replies', count: factors.emailReplies, weight: weights.EMAIL_REPLY, points: factors.emailReplies * weights.EMAIL_REPLY },
    { name: 'Form Submissions', count: factors.formSubmissions, weight: weights.FORM_SUBMISSION, points: factors.formSubmissions * weights.FORM_SUBMISSION },
    { name: 'Property Inquiries', count: factors.propertyInquiries, weight: weights.PROPERTY_INQUIRY, points: factors.propertyInquiries * weights.PROPERTY_INQUIRY },
    { name: 'Scheduled Appointments', count: factors.scheduledAppointments, weight: weights.SCHEDULED_APPOINTMENT, points: factors.scheduledAppointments * weights.SCHEDULED_APPOINTMENT },
    { name: 'Completed Appointments', count: factors.completedAppointments, weight: weights.COMPLETED_APPOINTMENT, points: factors.completedAppointments * weights.COMPLETED_APPOINTMENT },
  )

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
      activityFrequency: roundTo2(factors.activityFrequency),
      emailOptedOut: factors.emailOptedOut,
      hasEmail: factors.hasEmail,
      hasPhone: factors.hasPhone,
      hasCompany: factors.hasCompany,
      hasDealValue: factors.hasDealValue,
      hasPropertyType: factors.hasPropertyType,
      hasBudget: factors.hasBudget,
      hasBeenContacted: factors.hasBeenContacted,
      hasNotes: factors.hasNotes,
      activityCount: factors.activityCount,
      statusProgression: factors.statusProgression,
      hasTags: factors.hasTags,
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
        ...SCORE_WEIGHTS,
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
      logger.info(`📊 Using org-level scoring config for lead ${leadId}`);
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
      logger.info(`📊 Using personalized scoring weights for user ${userId}`);
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

  // Profile completeness factors
  if (factors.hasEmail) score += weights.HAS_EMAIL;
  if (factors.hasPhone) score += weights.HAS_PHONE;
  if (factors.hasCompany) score += weights.HAS_COMPANY;
  if (factors.hasDealValue) score += weights.HAS_DEAL_VALUE;
  if (factors.dealValueAbove500k) score += weights.DEAL_VALUE_ABOVE_500K;
  if (factors.hasPropertyType) score += weights.HAS_PROPERTY_TYPE;
  if (factors.hasBudget) score += weights.HAS_BUDGET;
  if (factors.hasBedsOrBaths) score += weights.HAS_BEDS_BATHS;
  if (factors.hasBeenContacted) score += weights.HAS_BEEN_CONTACTED;
  if (factors.contactedInLast7Days) score += weights.CONTACTED_LAST_7_DAYS;
  else if (factors.contactedInLast30Days) score += weights.CONTACTED_LAST_30_DAYS;
  if (factors.hasNotes) score += weights.HAS_NOTES;
  if (factors.activityCount > 10) score += weights.ACTIVITIES_ABOVE_10;
  else if (factors.activityCount > 5) score += weights.ACTIVITIES_ABOVE_5;

  const status = factors.statusProgression?.toUpperCase();
  if (status === 'CONTACTED') score += weights.STATUS_CONTACTED;
  else if (status === 'QUALIFIED') score += weights.STATUS_QUALIFIED;
  else if (status === 'PROPOSAL') score += weights.STATUS_PROPOSAL;
  else if (status === 'NEGOTIATION') score += weights.STATUS_NEGOTIATION;

  if (factors.hasTags) score += weights.HAS_TAGS;
  if (factors.emailOptIn) score += weights.EMAIL_OPT_IN;
  if (factors.smsOptIn) score += weights.SMS_OPT_IN;

  // Engagement-based scores with custom weights
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
  logger.info('🔄 Starting bulk lead score update with per-user personalization...');

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
      logger.info(`📊 Updating ${userLeads.length} leads for user ${userId} with personalized weights...`);
      
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
    logger.info(`📊 Updating ${leadsWithoutPersonalizedScoring.length} leads with default weights...`);
    
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

  logger.info(`✅ Bulk update complete: ${updated} leads updated, ${errors} errors`);
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
