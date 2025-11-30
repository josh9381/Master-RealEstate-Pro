import { MessageContext } from './message-context.service'

/**
 * Response Rate Prediction Service
 * Uses weighted scoring algorithm to predict message response rates
 */

interface PredictionFactors {
  length: number
  hasQuestion: boolean
  hasCTA: boolean
  personalizedTerms: number
  engagementHistory: number
  leadScore: number
  daysSinceContact: number
  timeOfDay: number
  dayOfWeek: number
}

/**
 * Predict response rate for a message (0-100%)
 */
export async function predictResponseRate(
  message: string,
  context: MessageContext
): Promise<number> {
  // Gather prediction factors
  const factors: PredictionFactors = {
    // Message factors
    length: message.length,
    hasQuestion: /\?/g.test(message),
    hasCTA: /call|schedule|book|meet|visit|view|tour|discuss/i.test(message),
    personalizedTerms: countPersonalizedTerms(message, context),
    
    // Lead factors
    engagementHistory: context.engagement.responseRate,
    leadScore: context.lead.score,
    daysSinceContact: getDaysSinceContact(context),
    
    // Time factors
    timeOfDay: new Date().getHours(),
    dayOfWeek: new Date().getDay()
  }
  
  // Weighted scoring algorithm
  let score = 50 // Base score
  
  // Length scoring (sweet spot: 50-150 words)
  const wordCount = message.split(/\s+/).length
  if (wordCount >= 50 && wordCount <= 150) {
    score += 10
  } else if (wordCount < 30) {
    score -= 8
  } else if (wordCount > 200) {
    score -= 10
  }
  
  // Question bonus (questions drive engagement)
  if (factors.hasQuestion) {
    score += 8
  }
  
  // CTA bonus (clear next steps improve response)
  if (factors.hasCTA) {
    score += 5
  }
  
  // Personalization bonus (up to 15 points)
  score += Math.min(factors.personalizedTerms * 3, 15)
  
  // Historical engagement (30% weight - strong predictor)
  score += (factors.engagementHistory - 50) * 0.3
  
  // Lead score influence (20% weight)
  score += (factors.leadScore - 50) * 0.2
  
  // Recency penalty (stale leads less responsive)
  if (factors.daysSinceContact > 7) score -= 5
  if (factors.daysSinceContact > 14) score -= 10
  if (factors.daysSinceContact > 30) score -= 15
  
  // Time optimization
  if (factors.timeOfDay >= 9 && factors.timeOfDay <= 11) {
    score += 5 // Morning sweet spot
  } else if (factors.timeOfDay >= 14 && factors.timeOfDay <= 16) {
    score += 3 // Early afternoon
  } else if (factors.timeOfDay < 8 || factors.timeOfDay > 18) {
    score -= 8 // Outside business hours
  }
  
  // Day of week
  if (factors.dayOfWeek === 0 || factors.dayOfWeek === 6) {
    score -= 8 // Weekend penalty
  } else if (factors.dayOfWeek === 2 || factors.dayOfWeek === 3) {
    score += 3 // Tuesday/Wednesday optimal
  }
  
  // Clamp between 0-100
  return Math.max(0, Math.min(100, Math.round(score)))
}

/**
 * Count personalized terms in message
 */
function countPersonalizedTerms(message: string, context: MessageContext): number {
  let count = 0
  const lowerMessage = message.toLowerCase()
  
  // Name mentions
  if (context.lead.name && lowerMessage.includes(context.lead.name.toLowerCase())) {
    count += 2
  }
  
  // Location mentions
  if (context.lead.location && lowerMessage.includes(context.lead.location.toLowerCase())) {
    count += 1
  }
  
  // Interest mentions
  context.lead.interests.forEach(interest => {
    if (lowerMessage.includes(interest.toLowerCase())) {
      count += 1
    }
  })
  
  // Property mentions
  if (context.properties.length > 0) {
    context.properties.forEach(prop => {
      if (lowerMessage.includes(prop.address.toLowerCase())) {
        count += 1
      }
    })
  }
  
  // Budget mentions
  if (context.lead.budget) {
    const budgetStr = context.lead.budget.toString()
    if (message.includes(budgetStr) || message.includes(formatCurrency(context.lead.budget))) {
      count += 1
    }
  }
  
  return count
}

/**
 * Calculate days since last contact
 */
function getDaysSinceContact(context: MessageContext): number {
  if (!context.engagement.lastContact) {
    return 999 // Never contacted
  }
  
  const now = new Date()
  const lastContact = new Date(context.engagement.lastContact)
  const diffMs = now.getTime() - lastContact.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  return diffDays
}

/**
 * Format currency for comparison
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0
  }).format(amount)
}

/**
 * Generate reasoning for prediction
 */
export function generatePredictionReasoning(
  score: number,
  message: string,
  context: MessageContext
): string {
  const wordCount = message.split(/\s+/).length
  const hasQuestion = /\?/g.test(message)
  const daysSince = getDaysSinceContact(context)
  const leadScore = context.lead.score
  
  const reasons: string[] = []
  
  // Lead quality
  if (leadScore >= 80) {
    reasons.push('Hot lead (high score)')
  } else if (leadScore >= 60) {
    reasons.push('Qualified lead')
  } else if (leadScore < 40) {
    reasons.push('Low lead score')
  }
  
  // Engagement history
  if (context.engagement.responseRate > 60) {
    reasons.push('responds frequently')
  } else if (context.engagement.responseRate < 20) {
    reasons.push('rarely responds')
  }
  
  // Message quality
  if (wordCount >= 50 && wordCount <= 150) {
    reasons.push('optimal length')
  } else if (wordCount < 30) {
    reasons.push('may be too brief')
  } else if (wordCount > 200) {
    reasons.push('may be too long')
  }
  
  if (hasQuestion) {
    reasons.push('includes question')
  }
  
  // Timing
  if (daysSince > 14) {
    reasons.push('long gap since contact')
  } else if (daysSince < 3) {
    reasons.push('timely follow-up')
  }
  
  return reasons.join(', ')
}
