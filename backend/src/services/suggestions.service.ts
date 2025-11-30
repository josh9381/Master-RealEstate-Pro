import { MessageContext } from './message-context.service'
import { ComposeSettings } from './ai-compose.service'

/**
 * Smart Suggestions Engine
 * Generates contextual tips based on lead behavior and message settings
 */

export interface Suggestion {
  type: 'tone' | 'length' | 'timing' | 'content' | 'personalization'
  text: string
  priority: 'high' | 'medium' | 'low'
  action?: {
    recommendedTone?: string
    recommendedLength?: string
    addPersonalization?: boolean
  }
}

/**
 * Generate smart suggestions based on context and settings
 */
export function generateSmartSuggestions(
  context: MessageContext,
  currentSettings: ComposeSettings
): Suggestion[] {
  const suggestions: Suggestion[] = []
  
  // Engagement-based suggestions
  if (context.engagement.openRate < 30) {
    suggestions.push({
      type: 'content',
      text: '⚠️ Low open rate (< 30%). Try a more compelling subject line with specifics.',
      priority: 'high'
    })
  }
  
  if (context.engagement.responseRate > 70) {
    suggestions.push({
      type: 'tone',
      text: '✅ This lead responds well (70%+ rate). Current approach is working!',
      priority: 'low'
    })
  } else if (context.engagement.responseRate < 20 && context.engagement.totalMessages > 3) {
    suggestions.push({
      type: 'tone',
      text: '⚠️ Low response rate. Try switching to a different tone or adding more value.',
      priority: 'high',
      action: {
        recommendedTone: currentSettings.tone === 'professional' ? 'friendly' : 'direct'
      }
    })
  }
  
  // Lead score suggestions
  if (context.lead.score >= 80 && currentSettings.tone !== 'direct') {
    suggestions.push({
      type: 'tone',
      text: '🔥 Hot lead (80+ score). Consider "Direct" tone for faster response.',
      priority: 'high',
      action: { recommendedTone: 'direct' }
    })
  } else if (context.lead.score < 40 && currentSettings.tone === 'direct') {
    suggestions.push({
      type: 'tone',
      text: '💡 Cold lead. Try "Friendly" tone to build rapport first.',
      priority: 'medium',
      action: { recommendedTone: 'friendly' }
    })
  }
  
  // Timing suggestions
  const daysSinceContact = getDaysSinceContact(context)
  if (daysSinceContact > 14) {
    suggestions.push({
      type: 'timing',
      text: `⏰ No contact for ${daysSinceContact} days. Use friendly re-engagement approach.`,
      priority: 'high',
      action: { recommendedTone: 'friendly', addPersonalization: true }
    })
  } else if (daysSinceContact === 0) {
    suggestions.push({
      type: 'timing',
      text: '⚠️ Already contacted today. Consider waiting 24-48 hours unless urgent.',
      priority: 'medium'
    })
  } else if (daysSinceContact >= 3 && daysSinceContact <= 5) {
    suggestions.push({
      type: 'timing',
      text: '✅ Perfect timing for follow-up (3-5 days since last contact).',
      priority: 'low'
    })
  }
  
  // Length suggestions based on history
  if (context.conversation.messageCount > 10 && currentSettings.length === 'detailed') {
    suggestions.push({
      type: 'length',
      text: '💬 Long conversation history. Shorter messages may work better now.',
      priority: 'medium',
      action: { recommendedLength: 'brief' }
    })
  } else if (context.conversation.messageCount === 0 && currentSettings.length === 'brief') {
    suggestions.push({
      type: 'length',
      text: '👋 First contact. Consider "Standard" length to properly introduce yourself.',
      priority: 'medium',
      action: { recommendedLength: 'standard' }
    })
  }
  
  // Personalization suggestions
  if (context.properties.length > 0 && currentSettings.personalization === 'basic') {
    suggestions.push({
      type: 'personalization',
      text: `🏠 Lead viewed ${context.properties.length} properties. Increase personalization!`,
      priority: 'high',
      action: { addPersonalization: true }
    })
  }
  
  if (context.lead.interests.length > 0 && currentSettings.personalization === 'basic') {
    suggestions.push({
      type: 'personalization',
      text: `💡 Known interests: ${context.lead.interests.slice(0, 2).join(', ')}. Reference these!`,
      priority: 'medium',
      action: { addPersonalization: true }
    })
  }
  
  // Budget-specific suggestions
  if (context.lead.budget && context.properties.length > 0) {
    const inBudgetProperties = context.properties.filter(
      p => p.price <= (context.lead.budget || 0) * 1.1
    )
    if (inBudgetProperties.length > 0) {
      suggestions.push({
        type: 'content',
        text: `💰 ${inBudgetProperties.length} properties match their budget. Mention these!`,
        priority: 'high'
      })
    }
  }
  
  // Response time suggestions
  if (context.engagement.avgResponseTime > 0) {
    const hours = context.engagement.avgResponseTime
    if (hours < 2) {
      suggestions.push({
        type: 'content',
        text: `⚡ Lead typically responds in ${hours}h. They're highly engaged!`,
        priority: 'low'
      })
    } else if (hours > 48) {
      suggestions.push({
        type: 'content',
        text: `🐌 Lead takes ${hours}h+ to respond. Don't expect immediate reply.`,
        priority: 'low'
      })
    }
  }
  
  // Status-based suggestions
  if (context.lead.status === 'HOT' && !currentSettings.includeCTA) {
    suggestions.push({
      type: 'content',
      text: '🔥 Hot lead without CTA. Add a clear call-to-action!',
      priority: 'high'
    })
  } else if (context.lead.status === 'COLD' && currentSettings.includeCTA) {
    suggestions.push({
      type: 'content',
      text: '❄️ Cold lead. Focus on providing value before asking for action.',
      priority: 'medium'
    })
  }
  
  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 }
  return suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
}

/**
 * Calculate days since last contact
 */
function getDaysSinceContact(context: MessageContext): number {
  if (!context.engagement.lastContact) {
    return 999
  }
  
  const now = new Date()
  const lastContact = new Date(context.engagement.lastContact)
  const diffMs = now.getTime() - lastContact.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  return diffDays
}

/**
 * Get suggestion summary for display
 */
export function getSuggestionSummary(suggestions: Suggestion[]): string {
  if (suggestions.length === 0) {
    return '✅ Message settings look good!'
  }
  
  const highPriority = suggestions.filter(s => s.priority === 'high')
  if (highPriority.length > 0) {
    return highPriority[0].text
  }
  
  return suggestions[0].text
}
