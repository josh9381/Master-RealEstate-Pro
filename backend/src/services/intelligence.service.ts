import { prisma } from '../config/database';
import { getOpenAIService } from './openai.service';

// Types for intelligence predictions and insights
export interface Prediction {
  leadId: string;
  conversionProbability: number; // 0-100
  confidence: 'low' | 'medium' | 'high';
  factors: {
    score: number;
    activityLevel: string;
    timeInFunnel: number; // days
    lastActivityDays: number;
  };
  reasoning: string;
}

export interface EngagementAnalysis {
  leadId: string;
  engagementScore: number; // 0-100
  trend: 'increasing' | 'stable' | 'declining';
  optimalContactTimes: {
    dayOfWeek: string;
    hourOfDay: number;
    confidence: number;
  }[];
  lastEngagementDate: Date | null;
}

export interface ActionSuggestion {
  leadId: string;
  action: 'call' | 'email' | 'text' | 'schedule_appointment' | 'nurture' | 'urgent_followup';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  reasoning: string;
  suggestedTiming: string;
  estimatedImpact: string;
}

export interface Insights {
  organizationId: string;
  summary: {
    totalLeads: number;
    hotLeads: number;
    atRiskLeads: number;
    avgConversionProbability: number;
    predictedRevenue: number;
  };
  topOpportunities: {
    leadId: string;
    leadName: string;
    conversionProbability: number;
    estimatedValue: number;
  }[];
  atRiskLeads: {
    leadId: string;
    leadName: string;
    churnRisk: number;
    daysSinceLastContact: number;
  }[];
  trends: {
    period: string;
    metric: string;
    value: number;
    change: number;
  }[];
}

export class IntelligenceService {
  /**
   * Predict lead conversion probability
   * Based on score, activity level, time in funnel, and engagement patterns
   * NOW USES USER-SPECIFIC WEIGHTS if available
   */
  async predictLeadConversion(leadId: string, userId?: string): Promise<Prediction> {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!lead) {
      throw new Error('Lead not found');
    }

    // Get user-specific scoring model if userId provided
    let weights = {
      scoreWeight: 0.4,
      activityWeight: 0.3,
      recencyWeight: 0.2,
      funnelTimeWeight: 0.1,
    };

    if (userId) {
      const scoringModel = await prisma.leadScoringModel.findUnique({
        where: { userId },
      });

      if (scoringModel && scoringModel.factors) {
        weights = scoringModel.factors as any;
        console.log(`📊 Using personalized weights for user ${userId}`);
      }
    }

    // Calculate factors
    const score = lead.score || 0;
    const activityCount = lead.activities.length;
    const createdAt = new Date(lead.createdAt);
    const now = new Date();
    const timeInFunnelDays = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
    
    const lastActivity = lead.activities[0];
    const lastActivityDays = lastActivity
      ? Math.floor((now.getTime() - new Date(lastActivity.createdAt).getTime()) / (1000 * 60 * 60 * 24))
      : timeInFunnelDays;

    // Calculate conversion probability USING USER-SPECIFIC WEIGHTS
    let probability = 0;
    
    // Score contribution (use personalized weight)
    probability += (score / 100) * (weights.scoreWeight * 100);
    
    // Activity level contribution (use personalized weight)
    const activityScore = Math.min(activityCount / 10, 1); // 10+ activities = max score
    probability += activityScore * (weights.activityWeight * 100);
    
    // Recency contribution (use personalized weight)
    const recencyScore = Math.max(1 - (lastActivityDays / 30), 0); // 30+ days = 0 score
    probability += recencyScore * (weights.recencyWeight * 100);
    
    // Time in funnel contribution (use personalized weight) - sweet spot is 7-21 days
    let funnelScore = 0;
    if (timeInFunnelDays >= 7 && timeInFunnelDays <= 21) {
      funnelScore = 1;
    } else if (timeInFunnelDays < 7) {
      funnelScore = timeInFunnelDays / 7;
    } else {
      funnelScore = Math.max(1 - ((timeInFunnelDays - 21) / 60), 0);
    }
    probability += funnelScore * (weights.funnelTimeWeight * 100);

    // Determine confidence level
    let confidence: 'low' | 'medium' | 'high';
    if (activityCount >= 10 && timeInFunnelDays >= 3) {
      confidence = 'high';
    } else if (activityCount >= 5 && timeInFunnelDays >= 1) {
      confidence = 'medium';
    } else {
      confidence = 'low';
    }

    // Generate reasoning
    let reasoning = '';
    if (probability >= 70) {
      reasoning = `High conversion potential. Strong engagement (${activityCount} activities) and excellent lead score (${score}).`;
    } else if (probability >= 40) {
      reasoning = `Moderate conversion potential. ${lastActivityDays < 7 ? 'Recent activity is positive.' : 'Could benefit from re-engagement.'} Score: ${score}/100.`;
    } else {
      reasoning = `Lower conversion potential. ${lastActivityDays > 14 ? `No activity in ${lastActivityDays} days.` : ''} May need nurturing or could be cold lead.`;
    }

    return {
      leadId,
      conversionProbability: Math.round(probability),
      confidence,
      factors: {
        score,
        activityLevel: activityCount >= 10 ? 'high' : activityCount >= 5 ? 'medium' : 'low',
        timeInFunnel: timeInFunnelDays,
        lastActivityDays,
      },
      reasoning,
    };
  }

  /**
   * Analyze lead engagement patterns
   * Identify optimal contact times and engagement trends
   */
  async analyzeLeadEngagement(leadId: string): Promise<EngagementAnalysis> {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 100,
        },
      },
    });

    if (!lead) {
      throw new Error('Lead not found');
    }

    const activities = lead.activities;
    const lastActivity = activities[0];

    // Calculate engagement score (0-100)
    const recentActivities = activities.filter(a => {
      const daysSince = (Date.now() - new Date(a.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      return daysSince <= 30;
    });

    const engagementScore = Math.min((recentActivities.length / 15) * 100, 100);

    // Determine trend by comparing recent vs older activities
    const veryRecentActivities = activities.filter(a => {
      const daysSince = (Date.now() - new Date(a.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      return daysSince <= 7;
    });
    const olderActivities = activities.filter(a => {
      const daysSince = (Date.now() - new Date(a.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      return daysSince > 7 && daysSince <= 30;
    });

    let trend: 'increasing' | 'stable' | 'declining';
    const recentRate = veryRecentActivities.length / 7;
    const olderRate = olderActivities.length / 23;

    if (recentRate > olderRate * 1.5) {
      trend = 'increasing';
    } else if (recentRate < olderRate * 0.5) {
      trend = 'declining';
    } else {
      trend = 'stable';
    }

    // Analyze optimal contact times (simplified - could use ML here)
    const activityByDayHour = activities.reduce((acc, activity) => {
      const date = new Date(activity.createdAt);
      const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()];
      const hourOfDay = date.getHours();
      const key = `${dayOfWeek}-${hourOfDay}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const optimalTimes = Object.entries(activityByDayHour)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([key, count]) => {
        const [dayOfWeek, hourOfDay] = key.split('-');
        return {
          dayOfWeek,
          hourOfDay: parseInt(hourOfDay),
          confidence: Math.min((count / activities.length) * 100, 100),
        };
      });

    return {
      leadId,
      engagementScore: Math.round(engagementScore),
      trend,
      optimalContactTimes: optimalTimes.length > 0 ? optimalTimes : [
        { dayOfWeek: 'Tuesday', hourOfDay: 10, confidence: 50 },
        { dayOfWeek: 'Thursday', hourOfDay: 14, confidence: 50 },
      ],
      lastEngagementDate: lastActivity ? new Date(lastActivity.createdAt) : null,
    };
  }

  /**
   * Suggest next best action for a lead
   * Based on conversion probability, engagement, and lead state
   * NOW USES USER-SPECIFIC PREDICTIONS
   */
  async suggestNextAction(leadId: string, userId?: string): Promise<ActionSuggestion> {
    const [prediction, engagement] = await Promise.all([
      this.predictLeadConversion(leadId, userId), // Pass userId for personalized prediction
      this.analyzeLeadEngagement(leadId),
    ]);

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      throw new Error('Lead not found');
    }

    let action: ActionSuggestion['action'];
    let priority: ActionSuggestion['priority'];
    let reasoning: string;
    let suggestedTiming: string;
    let estimatedImpact: string;

    // High conversion probability + high engagement = urgent call
    if (prediction.conversionProbability >= 70 && engagement.engagementScore >= 60) {
      action = 'call';
      priority = 'urgent';
      reasoning = 'Lead is highly engaged and ready to convert. Personal contact recommended.';
      suggestedTiming = 'Within 24 hours';
      estimatedImpact = 'High - Could close deal this week';
    }
    // High conversion but declining engagement = urgent followup
    else if (prediction.conversionProbability >= 60 && engagement.trend === 'declining') {
      action = 'urgent_followup';
      priority = 'urgent';
      reasoning = 'Strong lead losing interest. Immediate re-engagement required.';
      suggestedTiming = 'Today';
      estimatedImpact = 'Critical - Prevent lead from going cold';
    }
    // Medium conversion + stable engagement = schedule appointment
    else if (prediction.conversionProbability >= 40 && engagement.trend !== 'declining') {
      action = 'schedule_appointment';
      priority = 'high';
      reasoning = 'Lead showing consistent interest. Time to move to next stage.';
      suggestedTiming = 'Within 3 days';
      estimatedImpact = 'Medium-High - Progress toward conversion';
    }
    // Low engagement but not too old = nurture email
    else if (engagement.engagementScore < 40 && prediction.factors.lastActivityDays < 30) {
      action = 'email';
      priority = 'medium';
      reasoning = 'Lead needs nurturing. Share valuable content to rebuild interest.';
      suggestedTiming = 'Within 1 week';
      estimatedImpact = 'Medium - Re-engage and educate';
    }
    // Very cold lead = text for quick touchpoint
    else if (prediction.factors.lastActivityDays >= 30 && prediction.factors.lastActivityDays < 90) {
      action = 'text';
      priority = 'low';
      reasoning = 'Lead has gone cold. Quick text message to check in.';
      suggestedTiming = 'Next 2 weeks';
      estimatedImpact = 'Low-Medium - Attempt re-activation';
    }
    // Default nurture
    else {
      action = 'nurture';
      priority = 'low';
      reasoning = 'Lead in early stages. Add to nurture campaign for long-term engagement.';
      suggestedTiming = 'Automated sequence';
      estimatedImpact = 'Low - Build relationship over time';
    }

    return {
      leadId,
      action,
      priority,
      reasoning,
      suggestedTiming,
      estimatedImpact,
    };
  }

  /**
   * Generate organization-wide insights
   * Dashboard-level intelligence and predictions
   */
  async generateInsights(organizationId: string): Promise<Insights> {
    const leads = await prisma.lead.findMany({
      where: { organizationId },
      include: {
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    const totalLeads = leads.length;
    const hotLeads = leads.filter(l => (l.score || 0) >= 80).length;

    // Calculate at-risk leads (declining engagement)
    const atRiskLeadsData: Insights['atRiskLeads'] = [];
    for (const lead of leads) {
      const lastActivity = lead.activities[0];
      if (lastActivity) {
        const daysSince = Math.floor((Date.now() - new Date(lastActivity.createdAt).getTime()) / (1000 * 60 * 60 * 24));
        if (daysSince > 14 && (lead.score || 0) >= 40) {
          atRiskLeadsData.push({
            leadId: lead.id,
            leadName: `${lead.firstName} ${lead.lastName}`,
            churnRisk: Math.min((daysSince / 30) * 100, 100),
            daysSinceLastContact: daysSince,
          });
        }
      }
    }
    atRiskLeadsData.sort((a, b) => b.churnRisk - a.churnRisk);

    // Calculate top opportunities
    const topOpportunitiesData: Insights['topOpportunities'] = [];
    for (const lead of leads.slice(0, 20)) {
      try {
        // Use user-specific predictions if lead is assigned
        const prediction = await this.predictLeadConversion(lead.id, lead.assignedToId || undefined);
        if (prediction.conversionProbability >= 50) {
          topOpportunitiesData.push({
            leadId: lead.id,
            leadName: `${lead.firstName} ${lead.lastName}`,
            conversionProbability: prediction.conversionProbability,
            estimatedValue: this.estimateDealValue(lead.score || 0, prediction.conversionProbability),
          });
        }
      } catch (error) {
        console.error(`Error predicting lead ${lead.id}:`, error);
      }
    }
    topOpportunitiesData.sort((a, b) => b.conversionProbability - a.conversionProbability);

    // Calculate average conversion probability
    const avgConversionProbability = topOpportunitiesData.length > 0
      ? Math.round(topOpportunitiesData.reduce((sum, l) => sum + l.conversionProbability, 0) / topOpportunitiesData.length)
      : 0;

    // Calculate predicted revenue
    const predictedRevenue = topOpportunitiesData.reduce((sum, l) => sum + (l.estimatedValue * (l.conversionProbability / 100)), 0);

    // Simple trend calculation (would be more sophisticated with historical data)
    const trends = [
      {
        period: 'This Week',
        metric: 'New Leads',
        value: leads.filter(l => {
          const daysSince = (Date.now() - new Date(l.createdAt).getTime()) / (1000 * 60 * 60 * 24);
          return daysSince <= 7;
        }).length,
        change: 12.5, // Placeholder
      },
      {
        period: 'This Month',
        metric: 'Hot Leads',
        value: hotLeads,
        change: -5.2, // Placeholder
      },
      {
        period: 'This Month',
        metric: 'Avg Engagement',
        value: Math.round((leads.reduce((sum, l) => sum + (l.score || 0), 0) / totalLeads) || 0),
        change: 8.3, // Placeholder
      },
    ];

    return {
      organizationId,
      summary: {
        totalLeads,
        hotLeads,
        atRiskLeads: atRiskLeadsData.length,
        avgConversionProbability,
        predictedRevenue: Math.round(predictedRevenue),
      },
      topOpportunities: topOpportunitiesData.slice(0, 10),
      atRiskLeads: atRiskLeadsData.slice(0, 10),
      trends,
    };
  }

  /**
   * Estimate deal value based on lead quality and conversion probability
   */
  private estimateDealValue(score: number, conversionProbability: number): number {
    // Base commission assumption: $5,000 - $25,000 depending on lead quality
    const baseValue = 5000 + (score / 100) * 20000;
    
    // Adjust by conversion probability confidence
    const adjustedValue = baseValue * (0.5 + (conversionProbability / 200));
    
    return Math.round(adjustedValue);
  }

  // ===================================
  // Lead Scoring (migrated from ai.service.ts)
  // ===================================

  /**
   * Calculate lead score based on various factors
   * Uses AI when OpenAI is configured, falls back to rule-based scoring
   */
  async calculateLeadScore(leadId: string) {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        notes: true,
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        tags: true,
      }
    });

    if (!lead) {
      throw new Error('Lead not found');
    }

    let aiScore = null;
    const factors: Record<string, number> = {};

    // Try AI scoring first if OpenAI is configured
    if (process.env.OPENAI_API_KEY) {
      try {
        const openAI = getOpenAIService();
        
        const leadData = {
          name: `${lead.firstName} ${lead.lastName}`,
          email: lead.email,
          phone: lead.phone || 'N/A',
          status: lead.status,
          source: lead.source || 'Unknown',
          value: lead.value || 0,
          currentScore: lead.score,
          company: lead.company || 'N/A',
          position: lead.position || 'N/A',
          recentActivities: lead.activities.map(a => ({
            type: a.type,
            date: a.createdAt,
          })),
          tags: lead.tags.map(t => t.name),
          notesCount: lead.notes?.length || 0,
          createdAt: lead.createdAt,
        };

        aiScore = await openAI.analyzeLeadScore(leadData, lead.organizationId);
        
        // Update lead with AI score
        await prisma.lead.update({
          where: { id: leadId },
          data: {
            score: aiScore,
            scoreUpdatedAt: new Date(),
          },
        });

        return {
          leadId,
          score: aiScore,
          method: 'ai',
          factors: {
            aiAnalysis: aiScore,
          },
          timestamp: new Date(),
        };
      } catch (error) {
        console.error('AI scoring failed, falling back to rule-based:', error);
        // Fall through to rule-based scoring
      }
    }

    // Fallback: Rule-based scoring algorithm
    let score = 50; // Base score

    // Email engagement
    const emailEngagement = 10;
    score += emailEngagement;
    factors.emailEngagement = emailEngagement;

    // Response time / Activity
    const activityBonus = lead.activities && lead.activities.length > 0 ? 15 : 0;
    score += activityBonus;
    factors.responseTime = activityBonus;

    // Budget/value
    const budgetScore = (lead.status === 'QUALIFIED' || lead.status === 'NEGOTIATION') ? 20 : 0;
    score += budgetScore;
    factors.budget = budgetScore;

    // Company size
    const companySize = 10;
    score += companySize;
    factors.companySize = companySize;

    // Lead source quality
    const sourceQuality = 8;
    score += sourceQuality;
    factors.leadSource = sourceQuality;

    // Engagement (notes count)
    const engagementScore = lead.notes ? Math.min(lead.notes.length * 2, 10) : 0;
    score += engagementScore;
    factors.engagement = engagementScore;

    // Activity recency
    let recencyScore = 0;
    if (lead.activities && lead.activities.length > 0) {
      const lastActivity = lead.activities.sort((a, b) => 
        b.createdAt.getTime() - a.createdAt.getTime()
      )[0];
      const daysSinceActivity = (Date.now() - lastActivity.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceActivity < 7) {
        recencyScore = 5;
        score += recencyScore;
      }
    }
    factors.activityRecency = recencyScore;

    // Cap at 100
    score = Math.min(100, score);

    // Update lead with rule-based score
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        score,
        scoreUpdatedAt: new Date(),
      },
    });

    return {
      leadId,
      score,
      method: 'rule-based',
      factors,
      recommendation: score >= 80 ? 'high-priority' : score >= 60 ? 'medium-priority' : 'low-priority',
      confidence: 0.87,
      timestamp: new Date(),
    };
  }

  // ===================================
  // Data Quality (migrated from ai.service.ts)
  // ===================================

  /**
   * Get data quality metrics from real database analysis
   */
  async getDataQuality() {
    const leads = await prisma.lead.findMany({
      select: {
        email: true,
        phone: true,
        company: true,
        status: true,
        createdAt: true,
      }
    });

    if (leads.length === 0) {
      return [];
    }

    // Calculate completeness (fields filled)
    const completeness = leads.reduce((acc, lead) => {
      const fields = [lead.email, lead.phone, lead.company, lead.status];
      const filled = fields.filter(f => f && f.trim() !== '').length;
      return acc + (filled / fields.length);
    }, 0) / leads.length * 100;

    // Calculate timeliness (how recent are leads)
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recentLeads = leads.filter(l => l.createdAt >= thirtyDaysAgo).length;
    const timeliness = (recentLeads / leads.length) * 100;

    return [
      {
        metric: 'Completeness',
        score: Math.round(completeness),
        status: completeness >= 90 ? 'excellent' : completeness >= 70 ? 'good' : 'warning'
      },
      {
        metric: 'Timeliness',
        score: Math.round(timeliness),
        status: timeliness >= 80 ? 'excellent' : timeliness >= 60 ? 'good' : 'warning'
      },
    ];
  }

  // ===================================
  // Message Enhancement (migrated from ai.service.ts)
  // ===================================

  /**
   * Enhance a message using AI (OpenAI GPT-4 when configured)
   */
  async enhanceMessage(message: string, type?: string, tone?: string) {
    try {
      // Use real OpenAI service if API key is configured
      if (process.env.OPENAI_API_KEY) {
        const openAI = getOpenAIService();
        const selectedTone = tone || 'professional';
        const result = await openAI.enhanceMessage(message, selectedTone);
        
        return {
          original: message,
          enhanced: result.enhanced,
          improvements: ['AI-enhanced message', `Optimized for ${selectedTone} tone`],
          tone: selectedTone,
          type: type || 'email',
          tokens: result.tokens,
          cost: result.cost
        };
      }
      
      // Fallback to basic implementation if no API key
      const enhanced = message
        .replace(/\bhi\b/gi, 'Hello')
        .replace(/\bthanks\b/gi, 'Thank you')
        .trim();

      return {
        original: message,
        enhanced: enhanced + '\n\nBest regards,\nYour Real Estate Team',
        improvements: ['Added professional greeting', 'Improved tone', 'Added signature'],
        tone: tone || 'professional',
        type: type || 'email'
      };
    } catch (error) {
      console.error('Error enhancing message:', error);
      return {
        original: message,
        enhanced: message,
        improvements: ['Message unchanged due to error'],
        tone: tone || 'professional',
        type: type || 'email',
        error: 'AI enhancement unavailable'
      };
    }
  }

  // ===================================
  // Action Suggestions (migrated from ai.service.ts)
  // ===================================

  /**
   * Suggest actions based on context
   */
  async suggestActions(context: { context?: string; leadId?: string; campaignId?: string }) {
    const actions = [];

    if (context.leadId) {
      const lead = await prisma.lead.findUnique({
        where: { id: context.leadId }
      });

      if (lead) {
        if (lead.status === 'NEW') {
          actions.push({
            action: 'qualify-lead',
            title: 'Qualify this lead',
            description: 'Review and update lead status',
            priority: 'high'
          });
        }

        actions.push({
          action: 'schedule-followup',
          title: 'Schedule follow-up',
          description: 'Set a reminder to follow up with this lead',
          priority: 'medium'
        });

        actions.push({
          action: 'send-email',
          title: 'Send personalized email',
          description: 'Engage with a tailored message',
          priority: 'medium'
        });
      }
    }

    if (context.campaignId) {
      actions.push({
        action: 'optimize-campaign',
        title: 'Optimize campaign',
        description: 'Review performance and make improvements',
        priority: 'high'
      });
    }

    return actions;
  }
}

// Singleton instance
let intelligenceServiceInstance: IntelligenceService | null = null;

export function getIntelligenceService(): IntelligenceService {
  if (!intelligenceServiceInstance) {
    intelligenceServiceInstance = new IntelligenceService();
  }
  return intelligenceServiceInstance;
}
