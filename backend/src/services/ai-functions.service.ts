import { Prisma, TaskPriority, LeadStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { getOpenAIService } from './openai.service';
import { getIntelligenceService } from './intelligence.service';
import { sendEmail as sendRealEmail, type EmailResult } from './email.service';
import { sendSMS as sendRealSMS, type SMSResult } from './sms.service';
import { formatRate, calcOpenRate, calcClickRate, calcConversionRate, calcRate } from '../utils/metricsCalculator';
import { logger } from '../lib/logger';
import { AI_FUNCTIONS, DESTRUCTIVE_FUNCTIONS, ADMIN_ONLY_FUNCTIONS, READ_ONLY_FUNCTIONS } from './ai-function-definitions';
import type { FunctionArgs } from './ai-function-definitions';

// Re-export definitions so existing importers don't need changes
export { AI_FUNCTIONS, DESTRUCTIVE_FUNCTIONS, ADMIN_ONLY_FUNCTIONS, READ_ONLY_FUNCTIONS };
export type { FunctionArgs };

export class AIFunctionsService {
  /**
   * Check if a function requires user confirmation before execution.
   */
  isDestructiveFunction(functionName: string): boolean {
    return DESTRUCTIVE_FUNCTIONS.has(functionName);
  }

  /**
   * Check if a function requires admin/manager role.
   */
  isAdminOnlyFunction(functionName: string): boolean {
    return ADMIN_ONLY_FUNCTIONS.has(functionName);
  }

  // ============================================
  // LEAD CRUD OPERATIONS
  // ============================================
  
  async createLead(organizationId: string, userId: string, args: FunctionArgs): Promise<string> {
    try {
      if (!args.firstName || !args.lastName) {
        return JSON.stringify({ error: 'firstName and lastName are required' });
      }

      if (!args.email) {
        return JSON.stringify({ error: 'email is required' });
      }

      const lead = await prisma.lead.create({
        data: {
          firstName: args.firstName,
          lastName: args.lastName,
          email: args.email,
          phone: args.phone,
          status: (args.status || 'NEW') as LeadStatus,
          source: args.source || 'AI Assistant',
          score: args.score || 50,
          organizationId,
        },
      });

      // Add initial note if provided
      if (args.notes) {
        await prisma.note.create({
          data: {
            content: args.notes,
            leadId: lead.id,
            authorId: userId,
            organizationId,
          },
        });
      }

      // Log activity
      await prisma.activity.create({
        data: {
          type: 'LEAD_CREATED',
          title: 'Lead Created',
          description: `Lead created via AI Assistant`,
          leadId: lead.id,
          organizationId,
          userId,
        },
      });

      return JSON.stringify({
        success: true,
        lead: {
          id: lead.id,
          name: `${lead.firstName} ${lead.lastName}`,
          email: lead.email,
          phone: lead.phone,
          status: lead.status,
          score: lead.score,
        },
        message: `✅ Created new lead: ${lead.firstName} ${lead.lastName}`,
      });
    } catch (error) {
      logger.error('Create lead error:', error);
      return JSON.stringify({ error: 'Failed to create lead' });
    }
  }

  async updateLead(organizationId: string, args: FunctionArgs): Promise<string> {
    try {
      if (!args.leadId) {
        return JSON.stringify({ error: 'leadId is required' });
      }

      const lead = await prisma.lead.findFirst({
        where: { id: args.leadId, organizationId },
      });

      if (!lead) {
        return JSON.stringify({ error: 'Lead not found' });
      }

      const updateData: Record<string, unknown> = {};
      if (args.firstName) updateData.firstName = args.firstName;
      if (args.lastName) updateData.lastName = args.lastName;
      if (args.email) updateData.email = args.email;
      if (args.phone) updateData.phone = args.phone;
      if (args.source) updateData.source = args.source;
      if (args.score !== undefined) updateData.score = args.score;

      const updated = await prisma.lead.update({
        where: { id: args.leadId },
        data: updateData,
      });

      return JSON.stringify({
        success: true,
        message: `✅ Updated lead: ${updated.firstName} ${updated.lastName}`,
        lead: {
          id: updated.id,
          name: `${updated.firstName} ${updated.lastName}`,
          email: updated.email,
          phone: updated.phone,
          score: updated.score,
        },
      });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to update lead' });
    }
  }

  async deleteLead(organizationId: string, args: FunctionArgs): Promise<string> {
    try {
      if (!args.leadId) {
        return JSON.stringify({ error: 'leadId is required' });
      }

      const lead = await prisma.lead.findFirst({
        where: { id: args.leadId, organizationId },
      });

      if (!lead) {
        return JSON.stringify({ error: 'Lead not found' });
      }

      const leadName = `${lead.firstName} ${lead.lastName}`;

      await prisma.lead.delete({
        where: { id: args.leadId },
      });

      return JSON.stringify({
        success: true,
        message: `✅ Deleted lead: ${leadName}`,
      });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to delete lead' });
    }
  }

  async addNoteToLead(organizationId: string, userId: string, args: FunctionArgs): Promise<string> {
    try {
      if (!args.leadId || !args.content) {
        return JSON.stringify({ error: 'leadId and content are required' });
      }

      const lead = await prisma.lead.findFirst({
        where: { id: args.leadId, organizationId },
      });

      if (!lead) {
        return JSON.stringify({ error: 'Lead not found' });
      }

      await prisma.note.create({
        data: {
          content: args.content,
          leadId: args.leadId,
          authorId: userId,
          organizationId,
        },
      });

      return JSON.stringify({
        success: true,
        message: `✅ Added note to ${lead.firstName} ${lead.lastName}`,
      });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to add note' });
    }
  }

  async addTagToLead(organizationId: string, args: FunctionArgs): Promise<string> {
    try {
      if (!args.leadId || !args.tagName) {
        return JSON.stringify({ error: 'leadId and tagName are required' });
      }

      const lead = await prisma.lead.findFirst({
        where: { id: args.leadId, organizationId },
        include: { tags: true },
      });

      if (!lead) {
        return JSON.stringify({ error: 'Lead not found' });
      }

      // Check if tag already exists
      if (lead.tags.some(t => t.name.toLowerCase() === args.tagName!.toLowerCase())) {
        return JSON.stringify({
          success: true,
          message: `Tag "${args.tagName}" already exists on ${lead.firstName} ${lead.lastName}`,
        });
      }

      // Find or create tag
      let tag = await prisma.tag.findFirst({
        where: { 
          name: args.tagName,
          organizationId,
        },
      });

      if (!tag) {
        tag = await prisma.tag.create({
          data: {
            name: args.tagName,
            organizationId,
          },
        });
      }

      // Connect tag to lead
      await prisma.lead.update({
        where: { id: args.leadId },
        data: {
          tags: {
            connect: { id: tag.id },
          },
        },
      });

      return JSON.stringify({
        success: true,
        message: `✅ Added tag "${args.tagName}" to ${lead.firstName} ${lead.lastName}`,
      });
    } catch (error) {
      logger.error('Add tag error:', error);
      return JSON.stringify({ error: 'Failed to add tag' });
    }
  }

  async createActivity(organizationId: string, userId: string, args: FunctionArgs): Promise<string> {
    try {
      if (!args.leadId || !args.type || !args.description) {
        return JSON.stringify({ error: 'leadId, type, and description are required' });
      }

      const lead = await prisma.lead.findFirst({
        where: { id: args.leadId, organizationId },
      });

      if (!lead) {
        return JSON.stringify({ error: 'Lead not found' });
      }

      const activityTypeMap: Record<string, string> = {
        'CALL': 'CALL_MADE',
        'EMAIL': 'EMAIL_SENT',
        'MEETING': 'MEETING_SCHEDULED',
        'NOTE': 'NOTE_ADDED',
        'SMS': 'SMS_SENT',
        'OTHER': 'NOTE_ADDED',
      };

      await prisma.activity.create({
        data: {
          type: (activityTypeMap[args.type!] || 'NOTE_ADDED') as import('@prisma/client').ActivityType,
          title: args.type || 'Activity',
          description: args.description,
          leadId: args.leadId,
          organizationId,
          userId,
        },
      });

      return JSON.stringify({
        success: true,
        message: `✅ Logged ${args.type.toLowerCase()} activity for ${lead.firstName} ${lead.lastName}`,
      });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to create activity' });
    }
  }

  async sendEmail(organizationId: string, userId: string, args: FunctionArgs): Promise<string> {
    try {
      if (!args.leadId || !args.subject || !args.body) {
        return JSON.stringify({ error: 'leadId, subject, and body are required' });
      }

      const lead = await prisma.lead.findFirst({
        where: { id: args.leadId, organizationId },
      });

      if (!lead || !lead.email) {
        return JSON.stringify({ error: 'Lead not found or has no email' });
      }

      // Send email via the real email service
      const emailResult: EmailResult = await sendRealEmail({
        to: lead.email,
        subject: args.subject,
        html: args.body,
        text: args.body.replace(/<[^>]*>/g, ''), // strip HTML for plain text fallback
        organizationId,
        userId,
        leadId: args.leadId,
        trackOpens: true,
        trackClicks: true,
      });

      if (!emailResult.success) {
        return JSON.stringify({
          success: false,
          error: `Failed to send email: ${emailResult.error || 'Unknown error'}`,
        });
      }

      // Log the email as an activity
      await prisma.activity.create({
        data: {
          type: 'EMAIL_SENT',
          title: 'Email Sent',
          description: `Sent email: "${args.subject}"`,
          leadId: args.leadId,
          organizationId,
          userId,
        },
      });

      return JSON.stringify({
        success: true,
        message: `✅ Email sent to ${lead.firstName} ${lead.lastName} (${lead.email})`,
        messageId: emailResult.messageId,
      });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to send email' });
    }
  }

  async sendSMS(organizationId: string, userId: string, args: FunctionArgs): Promise<string> {
    try {
      if (!args.leadId || !args.message) {
        return JSON.stringify({ error: 'leadId and message are required' });
      }

      const lead = await prisma.lead.findFirst({
        where: { id: args.leadId, organizationId },
      });

      if (!lead || !lead.phone) {
        return JSON.stringify({ error: 'Lead not found or has no phone number' });
      }

      if (args.message.length > 1600) {
        return JSON.stringify({ error: 'SMS message must be 1600 characters or less' });
      }

      // Send SMS via the real SMS service (Twilio)
      const smsResult: SMSResult = await sendRealSMS({
        to: lead.phone,
        message: args.message,
        organizationId,
        userId,
        leadId: args.leadId,
      });

      if (!smsResult.success) {
        return JSON.stringify({
          success: false,
          error: `Failed to send SMS: ${smsResult.error || 'Unknown error'}`,
        });
      }

      // Log the SMS as an activity
      await prisma.activity.create({
        data: {
          type: 'SMS_SENT',
          title: 'SMS Sent',
          description: `Sent SMS: "${args.message.substring(0, 50)}${args.message.length > 50 ? '...' : ''}"`,
          leadId: args.leadId,
          organizationId,
          userId,
        },
      });

      return JSON.stringify({
        success: true,
        message: `✅ SMS sent to ${lead.firstName} ${lead.lastName} (${lead.phone})`,
        messageId: smsResult.messageId,
      });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to send SMS' });
    }
  }

  async scheduleAppointment(organizationId: string, userId: string, args: FunctionArgs): Promise<string> {
    try {
      if (!args.leadId || !args.title || !args.dateTime) {
        return JSON.stringify({ error: 'leadId, title, and dateTime are required' });
      }

      const lead = await prisma.lead.findFirst({
        where: { id: args.leadId, organizationId },
      });

      if (!lead) {
        return JSON.stringify({ error: 'Lead not found' });
      }

      // Create as a task with scheduled time
      await prisma.task.create({
        data: {
          title: args.title,
          description: args.notes || `Meeting with ${lead.firstName} ${lead.lastName}`,
          dueDate: new Date(args.dateTime),
          priority: 'HIGH' as TaskPriority,
          status: 'PENDING',
          leadId: args.leadId,
          assignedToId: userId,
          organizationId,
        },
      });

      // Log activity
      await prisma.activity.create({
        data: {
          type: 'MEETING_SCHEDULED',
          title: args.title,
          description: `Scheduled: ${args.title} on ${new Date(args.dateTime).toLocaleString()}`,
          leadId: args.leadId,
          organizationId,
          userId,
        },
      });

      return JSON.stringify({
        success: true,
        message: `✅ Scheduled "${args.title}" with ${lead.firstName} ${lead.lastName} on ${new Date(args.dateTime).toLocaleString()}`,
        appointment: {
          title: args.title,
          dateTime: args.dateTime,
          location: args.location,
        },
      });
    } catch (error) {
      logger.error('Schedule appointment error:', error);
      return JSON.stringify({ error: 'Failed to schedule appointment' });
    }
  }

  // ============================================
  // EXISTING FUNCTIONS (Keep all below)
  // ============================================
  
  async getLeadCount(organizationId: string, args: FunctionArgs): Promise<string> {
    try {
      const where: Prisma.LeadWhereInput = { organizationId };
      if (args.status) where.status = args.status as LeadStatus;
      if (args.scoreMin !== undefined) where.score = { gte: args.scoreMin };
      if (args.scoreMax !== undefined) {
        if (where.score && typeof where.score === 'object' && 'gte' in where.score) {
          where.score = { gte: where.score.gte, lte: args.scoreMax };
        } else {
          where.score = { lte: args.scoreMax };
        }
      }

      const count = await prisma.lead.count({ where });
      return JSON.stringify({ count, description: `${count} leads` });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to get lead count' });
    }
  }

  async searchLeads(organizationId: string, args: FunctionArgs): Promise<string> {
    try {
      const where: Prisma.LeadWhereInput = { organizationId };
      if (args.status) where.status = args.status as LeadStatus;
      if (args.scoreMin !== undefined) where.score = { gte: args.scoreMin };

      const leads = await prisma.lead.findMany({
        where,
        take: args.limit || 10,
        orderBy: { score: 'desc' },
        select: { id: true, firstName: true, lastName: true, email: true, phone: true, status: true, score: true },
      });

      return JSON.stringify({ count: leads.length, leads: leads.map((l) => ({ id: l.id, name: `${l.firstName} ${l.lastName}`, email: l.email, status: l.status, score: l.score })) });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to search leads' });
    }
  }

  async createTask(organizationId: string, userId: string, args: FunctionArgs): Promise<string> {
    try {
      if (!args.leadId || !args.title) return JSON.stringify({ error: 'leadId and title required' });
      
      const lead = await prisma.lead.findFirst({ where: { id: args.leadId, organizationId } });
      if (!lead) return JSON.stringify({ error: 'Lead not found' });

      await prisma.task.create({
        data: {
          title: args.title,
          description: args.description || '',
          dueDate: args.dueDate ? new Date(args.dueDate) : undefined,
          priority: (args.priority || 'MEDIUM') as TaskPriority,
          status: 'PENDING',
          leadId: args.leadId,
          assignedToId: userId,
          organizationId,
        },
      });

      return JSON.stringify({ success: true, message: `Task created for ${lead.firstName} ${lead.lastName}` });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to create task' });
    }
  }

  async updateLeadStatus(organizationId: string, args: FunctionArgs): Promise<string> {
    try {
      if (!args.leadId || !args.status) return JSON.stringify({ error: 'leadId and status required' });

      const lead = await prisma.lead.findFirst({ where: { id: args.leadId, organizationId } });
      if (!lead) return JSON.stringify({ error: 'Lead not found' });

      await prisma.lead.update({ where: { id: args.leadId }, data: { status: args.status as LeadStatus } });
      return JSON.stringify({ success: true, message: `Lead status updated to ${args.status}` });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to update lead status' });
    }
  }

  async getRecentActivities(organizationId: string, args: FunctionArgs): Promise<string> {
    try {
      const where: Prisma.ActivityWhereInput = { organizationId };
      if (args.leadId) where.leadId = args.leadId;

      const activities = await prisma.activity.findMany({
        where,
        take: args.limit || 20,
        orderBy: { createdAt: 'desc' },
        select: { id: true, type: true, description: true, createdAt: true },
      });

      return JSON.stringify({ count: activities.length, activities });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to get activities' });
    }
  }

  async getLeadDetails(organizationId: string, args: FunctionArgs): Promise<string> {
    try {
      if (!args.leadId) return JSON.stringify({ error: 'leadId required' });

      const lead = await prisma.lead.findFirst({
        where: { id: args.leadId, organizationId },
        select: { id: true, firstName: true, lastName: true, email: true, phone: true, status: true, score: true, source: true },
      });

      if (!lead) return JSON.stringify({ error: 'Lead not found' });
      return JSON.stringify({ lead });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to get lead details' });
    }
  }

  async composeEmail(organizationId: string, userId: string, args: FunctionArgs): Promise<string> {
    try {
      if (!args.leadId || !args.purpose) {
        return JSON.stringify({ error: 'leadId and purpose required' });
      }

      const lead = await prisma.lead.findFirst({
        where: { id: args.leadId, organizationId },
        include: {
          activities: { orderBy: { createdAt: 'desc' }, take: 5 },
          notes: { orderBy: { createdAt: 'desc' }, take: 3 },
          tags: true,
        }
      });

      if (!lead) {
        return JSON.stringify({ error: 'Lead not found' });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true, email: true }
      });

      const leadContext = {
        name: `${lead.firstName} ${lead.lastName}`,
        status: lead.status,
        score: lead.score,
        source: lead.source,
        interests: lead.tags.map(t => t.name).join(', '),
        recentActivity: lead.activities.length > 0 
          ? lead.activities[0].description 
          : 'No recent activity',
        notes: lead.notes.length > 0 
          ? lead.notes[0].content 
          : 'No notes available'
      };

      const openAI = getOpenAIService();
      const emailPrompt = `Draft a ${args.tone || 'professional'} email for a real estate lead:

Lead: ${leadContext.name} (Score: ${leadContext.score}/100, Status: ${leadContext.status})
Interests: ${leadContext.interests}
Recent Activity: ${leadContext.recentActivity}
Purpose: ${args.purpose}
Key Points: ${args.keyPoints ? args.keyPoints.join(', ') : 'Use best judgment'}

Requirements:
- Personalize based on lead's interests and activity
- Include clear subject line (start with "Subject:")
- ${args.includeCTA !== false ? 'Include strong call-to-action' : 'No hard CTA needed'}
- Tone: ${args.tone || 'professional'}
- Keep it under 300 words
- Sign as: ${user?.firstName} ${user?.lastName}

Generate the email:`;

      const emailContent = await openAI.chat(
        [{ role: 'user', content: emailPrompt }],
        userId,
        organizationId
      );

      return JSON.stringify({
        success: true,
        email: {
          subject: this.extractSubjectLine(emailContent.response),
          body: this.extractEmailBody(emailContent.response),
          tone: args.tone || 'professional',
          leadName: leadContext.name,
          purpose: args.purpose,
          metadata: {
            leadScore: leadContext.score,
            leadStatus: leadContext.status,
            generatedAt: new Date().toISOString()
          }
        }
      });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to compose email' });
    }
  }

  async composeSMS(organizationId: string, userId: string, args: FunctionArgs): Promise<string> {
    try {
      if (!args.leadId || !args.purpose) {
        return JSON.stringify({ error: 'leadId and purpose required' });
      }

      const lead = await prisma.lead.findFirst({
        where: { id: args.leadId, organizationId },
        select: { firstName: true, lastName: true, score: true, status: true }
      });

      if (!lead) {
        return JSON.stringify({ error: 'Lead not found' });
      }

      const openAI = getOpenAIService();
      const maxLength = args.maxLength || 160;

      const smsPrompt = `Draft a ${args.tone || 'friendly'} SMS message for:

Lead: ${lead.firstName} ${lead.lastName}
Purpose: ${args.purpose}
Max Length: ${maxLength} characters (STRICT LIMIT)
Tone: ${args.tone || 'friendly'}

Requirements:
- Must be under ${maxLength} characters
- Include lead's first name
- Clear and direct
- Include action if needed
- No emojis unless tone is casual

Generate the SMS:`;

      const smsContent = await openAI.chat(
        [{ role: 'user', content: smsPrompt }],
        userId,
        organizationId
      );

      const message = smsContent.response.trim();
      const length = message.length;

      return JSON.stringify({
        success: true,
        sms: {
          message: length <= maxLength ? message : message.substring(0, maxLength - 3) + '...',
          length,
          maxLength,
          tone: args.tone || 'friendly',
          leadName: `${lead.firstName} ${lead.lastName}`,
          purpose: args.purpose,
          warning: length > maxLength ? 'Message was truncated to fit limit' : null
        }
      });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to compose SMS' });
    }
  }

  async composeScript(organizationId: string, userId: string, args: FunctionArgs): Promise<string> {
    try {
      if (!args.leadId || !args.purpose) {
        return JSON.stringify({ error: 'leadId and purpose required' });
      }

      const lead = await prisma.lead.findFirst({
        where: { id: args.leadId, organizationId },
        include: {
          activities: { orderBy: { createdAt: 'desc' }, take: 3 },
          tags: true
        }
      });

      if (!lead) {
        return JSON.stringify({ error: 'Lead not found' });
      }

      const openAI = getOpenAIService();

      const scriptPrompt = `Create a ${args.tone || 'professional'} call script for:

Lead: ${lead.firstName} ${lead.lastName}
Score: ${lead.score}/100
Status: ${lead.status}
Interests: ${lead.tags.map(t => t.name).join(', ')}
Purpose: ${args.purpose}
Tone: ${args.tone || 'professional'}

Script Structure:
1. Opening (greeting and intro)
2. Purpose statement
3. Value proposition
4. Questions to ask
${args.includeObjections ? '5. Common objections and responses' : ''}
6. Closing and next steps

Requirements:
- Natural conversation flow
- Personalized to lead's interests
- Include specific questions
- Strong call-to-action
${args.includeObjections ? '- Include 3-5 common objections with responses' : ''}

Generate the script:`;

      const scriptContent = await openAI.chat(
        [{ role: 'user', content: scriptPrompt }],
        userId,
        organizationId
      );

      return JSON.stringify({
        success: true,
        script: {
          content: scriptContent.response,
          tone: args.tone || 'professional',
          leadName: `${lead.firstName} ${lead.lastName}`,
          purpose: args.purpose,
          includesObjections: args.includeObjections || false,
          leadScore: lead.score,
          leadStatus: lead.status
        }
      });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to compose script' });
    }
  }

  async predictConversion(organizationId: string, args: FunctionArgs): Promise<string> {
    try {
      if (!args.leadId) {
        return JSON.stringify({ error: 'leadId required' });
      }

      const intelligenceService = getIntelligenceService();
      // Get lead to find assignedToId for personalized prediction
      const lead = await prisma.lead.findUnique({ where: { id: args.leadId }, select: { assignedToId: true } });
      const prediction = await intelligenceService.predictLeadConversion(args.leadId, lead?.assignedToId || undefined);

      return JSON.stringify({
        success: true,
        prediction: {
          leadId: prediction.leadId,
          probability: prediction.conversionProbability,
          confidence: prediction.confidence,
          reasoning: prediction.reasoning,
          factors: prediction.factors
        }
      });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to predict conversion' });
    }
  }

  async getNextAction(organizationId: string, args: FunctionArgs): Promise<string> {
    try {
      if (!args.leadId) {
        return JSON.stringify({ error: 'leadId required' });
      }

      const intelligenceService = getIntelligenceService();
      const action = await intelligenceService.suggestNextAction(args.leadId);

      return JSON.stringify({
        success: true,
        recommendation: {
          action: action.action,
          priority: action.priority,
          reasoning: action.reasoning,
          timing: action.suggestedTiming,
          impact: action.estimatedImpact
        }
      });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to get recommendation' });
    }
  }

  async analyzeEngagement(organizationId: string, args: FunctionArgs): Promise<string> {
    try {
      if (!args.leadId) {
        return JSON.stringify({ error: 'leadId required' });
      }

      const intelligenceService = getIntelligenceService();
      const engagement = await intelligenceService.analyzeLeadEngagement(args.leadId);

      return JSON.stringify({
        success: true,
        engagement: {
          score: engagement.engagementScore,
          trend: engagement.trend,
          optimalTimes: engagement.optimalContactTimes,
          lastEngagement: engagement.lastEngagementDate
        }
      });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to analyze engagement' });
    }
  }

  async identifyAtRiskLeads(organizationId: string, args: FunctionArgs): Promise<string> {
    try {
      const minScore = args.minScore || 50;
      const daysInactive = args.daysInactive || 7;

      const leads = await prisma.lead.findMany({
        where: {
          organizationId,
          score: { gte: minScore },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          score: true,
          status: true,
          activities: {
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        },
        take: 20
      });

      const atRiskLeads = leads.filter(lead => {
        if (lead.activities.length === 0) return true;
        const daysSince = Math.floor((Date.now() - lead.activities[0].createdAt.getTime()) / (1000 * 60 * 60 * 24));
        return daysSince >= daysInactive;
      }).map(lead => ({
        id: lead.id,
        name: `${lead.firstName} ${lead.lastName}`,
        score: lead.score,
        status: lead.status,
        daysSinceContact: lead.activities[0] 
          ? Math.floor((Date.now() - lead.activities[0].createdAt.getTime()) / (1000 * 60 * 60 * 24))
          : 999
      }));

      return JSON.stringify({
        success: true,
        atRiskLeads,
        count: atRiskLeads.length,
        criteria: { minScore, daysInactive }
      });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to identify at-risk leads' });
    }
  }

  // ============================================
  // TASK MANAGEMENT
  // ============================================
  
  async updateTask(organizationId: string, args: FunctionArgs): Promise<string> {
    try {
      if (!args.taskId) return JSON.stringify({ error: 'taskId is required' });
      
      const updateData: Prisma.TaskUpdateInput = {};
      if (args.title) updateData.title = args.title;
      if (args.description) updateData.description = args.description;
      if (args.dueDate) updateData.dueDate = new Date(args.dueDate);
      if (args.priority) updateData.priority = args.priority as TaskPriority;
      if (typeof args.completed === 'boolean') updateData.completedAt = args.completed ? new Date() : null;
      
      const task = await prisma.task.update({
        where: { id: args.taskId },
        data: updateData,
      });
      
      return JSON.stringify({
        success: true,
        task: { id: task.id, title: task.title, completed: !!task.completedAt }
      });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to update task' });
    }
  }
  
  async deleteTask(organizationId: string, args: FunctionArgs): Promise<string> {
    try {
      if (!args.taskId) return JSON.stringify({ error: 'taskId is required' });
      
      await prisma.task.delete({
        where: { id: args.taskId },
      });
      
      return JSON.stringify({ success: true, message: 'Task deleted successfully' });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to delete task' });
    }
  }
  
  async completeTask(organizationId: string, args: FunctionArgs): Promise<string> {
    try {
      if (!args.taskId) return JSON.stringify({ error: 'taskId is required' });
      
      const task = await prisma.task.update({
        where: { id: args.taskId },
        data: { completedAt: new Date(), status: 'COMPLETED' },
      });
      
      return JSON.stringify({
        success: true,
        task: { id: task.id, title: task.title, completed: true }
      });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to complete task' });
    }
  }
  
  // ============================================
  // APPOINTMENT MANAGEMENT
  // ============================================
  
  async updateAppointment(organizationId: string, args: FunctionArgs): Promise<string> {
    try {
      if (!args.appointmentId) return JSON.stringify({ error: 'appointmentId is required' });
      
      const updateData: Prisma.AppointmentUpdateInput = {};
      if (args.title) updateData.title = args.title;
      if (args.dateTime) updateData.startTime = new Date(args.dateTime);
      if (args.location) updateData.location = args.location;
      if (args.notes) updateData.description = args.notes;
      
      const appointment = await prisma.appointment.update({
        where: { id: args.appointmentId, organizationId },
        data: updateData,
      });
      
      return JSON.stringify({
        success: true,
        appointment: { id: appointment.id, title: appointment.title, startTime: appointment.startTime }
      });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to update appointment' });
    }
  }
  
  async cancelAppointment(organizationId: string, args: FunctionArgs): Promise<string> {
    try {
      if (!args.appointmentId) return JSON.stringify({ error: 'appointmentId is required' });
      
      const appointment = await prisma.appointment.update({
        where: { id: args.appointmentId, organizationId },
        data: { 
          status: 'CANCELLED',
          description: args.reason ? `Cancelled: ${args.reason}` : 'Cancelled'
        },
      });
      
      return JSON.stringify({
        success: true,
        message: 'Appointment cancelled',
        appointment: { id: appointment.id, status: appointment.status }
      });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to cancel appointment' });
    }
  }
  
  async confirmAppointment(organizationId: string, args: FunctionArgs): Promise<string> {
    try {
      if (!args.appointmentId) return JSON.stringify({ error: 'appointmentId is required' });
      
      const appointment = await prisma.appointment.update({
        where: { id: args.appointmentId, organizationId },
        data: { status: 'CONFIRMED' },
      });
      
      return JSON.stringify({
        success: true,
        message: 'Appointment confirmed',
        appointment: { id: appointment.id, status: appointment.status }
      });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to confirm appointment' });
    }
  }
  
  async rescheduleAppointment(organizationId: string, args: FunctionArgs): Promise<string> {
    try {
      if (!args.appointmentId || !args.newDateTime) {
        return JSON.stringify({ error: 'appointmentId and newDateTime are required' });
      }
      
      const appointment = await prisma.appointment.update({
        where: { id: args.appointmentId, organizationId },
        data: { 
          startTime: new Date(args.newDateTime),
          status: 'SCHEDULED'
        },
      });
      
      return JSON.stringify({
        success: true,
        message: 'Appointment rescheduled',
        appointment: { id: appointment.id, startTime: appointment.startTime }
      });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to reschedule appointment' });
    }
  }
  
  // ============================================
  // NOTE MANAGEMENT
  // ============================================
  
  async updateNote(organizationId: string, args: FunctionArgs): Promise<string> {
    try {
      if (!args.noteId || !args.content) {
        return JSON.stringify({ error: 'noteId and content are required' });
      }
      
      const note = await prisma.note.update({
        where: { id: args.noteId },
        data: { content: args.content },
      });
      
      return JSON.stringify({
        success: true,
        note: { id: note.id, content: note.content }
      });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to update note' });
    }
  }
  
  async deleteNote(organizationId: string, args: FunctionArgs): Promise<string> {
    try {
      if (!args.noteId) return JSON.stringify({ error: 'noteId is required' });
      
      await prisma.note.delete({
        where: { id: args.noteId },
      });
      
      return JSON.stringify({ success: true, message: 'Note deleted successfully' });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to delete note' });
    }
  }
  
  // ============================================
  // TAG MANAGEMENT
  // ============================================
  
  async createTag(organizationId: string, args: FunctionArgs): Promise<string> {
    try {
      if (!args.name) return JSON.stringify({ error: 'Tag name is required' });
      
      const tag = await prisma.tag.create({
        data: {
          name: args.name,
          color: args.color || '#3B82F6',
          organizationId,
        },
      });
      
      return JSON.stringify({
        success: true,
        tag: { id: tag.id, name: tag.name, color: tag.color }
      });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to create tag' });
    }
  }
  
  async updateTag(organizationId: string, args: FunctionArgs): Promise<string> {
    try {
      if (!args.tagId) return JSON.stringify({ error: 'tagId is required' });
      
      const updateData: Prisma.TagUpdateInput = {};
      if (args.name) updateData.name = args.name;
      if (args.color) updateData.color = args.color;
      
      const tag = await prisma.tag.update({
        where: { id: args.tagId, organizationId },
        data: updateData,
      });
      
      return JSON.stringify({
        success: true,
        tag: { id: tag.id, name: tag.name, color: tag.color }
      });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to update tag' });
    }
  }
  
  async deleteTag(organizationId: string, args: FunctionArgs): Promise<string> {
    try {
      if (!args.tagId) return JSON.stringify({ error: 'tagId is required' });
      
      await prisma.tag.delete({
        where: { id: args.tagId, organizationId },
      });
      
      return JSON.stringify({ success: true, message: 'Tag deleted successfully' });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to delete tag' });
    }
  }
  
  async removeTagFromLead(organizationId: string, args: FunctionArgs): Promise<string> {
    try {
      if (!args.leadId || !args.tagId) {
        return JSON.stringify({ error: 'leadId and tagId are required' });
      }
      
      await prisma.lead.update({
        where: { id: args.leadId, organizationId },
        data: {
          tags: {
            disconnect: { id: args.tagId }
          }
        },
      });
      
      return JSON.stringify({ success: true, message: 'Tag removed from lead' });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to remove tag from lead' });
    }
  }

  // ============================================
  // CAMPAIGN MANAGEMENT
  // ============================================
  
  async createCampaign(organizationId: string, userId: string, args: FunctionArgs): Promise<string> {
    try {
      if (!args.name || !args.type || !args.content) {
        return JSON.stringify({ error: 'name, type, and content are required' });
      }
      
      const campaignType = args.type === 'EMAIL' ? 'EMAIL' : args.type === 'SMS' ? 'SMS' : 'EMAIL';
      
      const campaign = await prisma.campaign.create({
        data: {
          name: args.name,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          type: campaignType as any,
          status: 'DRAFT',
          subject: args.subject || args.name,
          body: args.content,
          createdById: userId,
          organizationId,
          startDate: args.scheduledFor ? new Date(args.scheduledFor) : undefined,
        },
      });
      
      return JSON.stringify({
        success: true,
        campaign: {
          id: campaign.id,
          name: campaign.name,
          type: campaign.type,
          status: campaign.status,
        },
        message: `✅ Created campaign: ${campaign.name}`,
      });
    } catch (error) {
      logger.error('Create campaign error:', error);
      return JSON.stringify({ error: 'Failed to create campaign' });
    }
  }
  
  async updateCampaign(organizationId: string, args: FunctionArgs): Promise<string> {
    try {
      if (!args.campaignId) {
        return JSON.stringify({ error: 'campaignId is required' });
      }
      
      const updateData: Record<string, unknown> = {};
      if (args.name) updateData.name = args.name;
      if (args.subject) updateData.subject = args.subject;
      if (args.content) updateData.body = args.content;
      if (args.scheduledFor) updateData.startDate = new Date(args.scheduledFor as string);
      
      const campaign = await prisma.campaign.update({
        where: { id: args.campaignId, organizationId },
        data: updateData,
      });
      
      return JSON.stringify({
        success: true,
        message: `✅ Updated campaign: ${campaign.name}`,
      });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to update campaign' });
    }
  }
  
  async deleteCampaign(organizationId: string, args: FunctionArgs): Promise<string> {
    try {
      if (!args.campaignId) {
        return JSON.stringify({ error: 'campaignId is required' });
      }
      
      const campaign = await prisma.campaign.findFirst({
        where: { id: args.campaignId, organizationId },
      });
      
      if (!campaign) {
        return JSON.stringify({ error: 'Campaign not found' });
      }
      
      await prisma.campaign.delete({
        where: { id: args.campaignId },
      });
      
      return JSON.stringify({
        success: true,
        message: `✅ Deleted campaign: ${campaign.name}`,
      });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to delete campaign' });
    }
  }
  
  async pauseCampaign(organizationId: string, args: FunctionArgs): Promise<string> {
    try {
      if (!args.campaignId) {
        return JSON.stringify({ error: 'campaignId is required' });
      }
      
      const campaign = await prisma.campaign.update({
        where: { id: args.campaignId, organizationId },
        data: { status: 'PAUSED' },
      });
      
      return JSON.stringify({
        success: true,
        message: `⏸️ Paused campaign: ${campaign.name}`,
      });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to pause campaign' });
    }
  }
  
  async sendCampaign(organizationId: string, args: FunctionArgs): Promise<string> {
    try {
      if (!args.campaignId) {
        return JSON.stringify({ error: 'campaignId is required' });
      }
      
      const sendNow = args.sendNow !== false;
      
      const campaign = await prisma.campaign.update({
        where: { id: args.campaignId, organizationId },
        data: {
          status: sendNow ? 'ACTIVE' : 'SCHEDULED',
          lastSentAt: sendNow ? new Date() : undefined,
          nextSendAt: sendNow ? undefined : (args.scheduledFor ? new Date(args.scheduledFor) : undefined),
        },
      });
      
      return JSON.stringify({
        success: true,
        message: sendNow 
          ? `🚀 Campaign launched: ${campaign.name}` 
          : `📅 Campaign scheduled: ${campaign.name}`,
      });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to send campaign' });
    }
  }
  
  async duplicateCampaign(organizationId: string, args: FunctionArgs): Promise<string> {
    try {
      if (!args.campaignId) {
        return JSON.stringify({ error: 'campaignId is required' });
      }
      
      const original = await prisma.campaign.findFirst({
        where: { id: args.campaignId, organizationId },
      });
      
      if (!original) {
        return JSON.stringify({ error: 'Campaign not found' });
      }
      
      const duplicate = await prisma.campaign.create({
        data: {
          name: args.newName || `${original.name} (Copy)`,
          type: original.type,
          status: 'DRAFT',
          subject: original.subject,
          body: original.body,
          previewText: original.previewText,
          createdById: original.createdById,
          organizationId,
        },
      });
      
      return JSON.stringify({
        success: true,
        campaign: { id: duplicate.id, name: duplicate.name },
        message: `📋 Duplicated campaign: ${duplicate.name}`,
      });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to duplicate campaign' });
    }
  }
  
  async archiveCampaign(organizationId: string, args: FunctionArgs): Promise<string> {
    try {
      if (!args.campaignId) {
        return JSON.stringify({ error: 'campaignId is required' });
      }
      
      const campaign = await prisma.campaign.update({
        where: { id: args.campaignId, organizationId },
        data: {
          isArchived: true,
          archivedAt: new Date(),
          status: 'COMPLETED',
        },
      });
      
      return JSON.stringify({
        success: true,
        message: `📦 Archived campaign: ${campaign.name}`,
      });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to archive campaign' });
    }
  }
  
  async getCampaignAnalytics(organizationId: string, args: FunctionArgs): Promise<string> {
    try {
      if (!args.campaignId) {
        return JSON.stringify({ error: 'campaignId is required' });
      }
      
      const campaign = await prisma.campaign.findFirst({
        where: { id: args.campaignId, organizationId },
      });
      
      if (!campaign) {
        return JSON.stringify({ error: 'Campaign not found' });
      }
      
      const openRate = formatRate(calcOpenRate(campaign.opened, campaign.sent));
      const clickRate = formatRate(calcClickRate(campaign.clicked, campaign.sent));
      const conversionRate = formatRate(calcConversionRate(campaign.converted, campaign.sent));
      
      return JSON.stringify({
        success: true,
        analytics: {
          name: campaign.name,
          status: campaign.status,
          sent: campaign.sent,
          delivered: campaign.delivered,
          opened: campaign.opened,
          clicked: campaign.clicked,
          converted: campaign.converted,
          bounced: campaign.bounced,
          unsubscribed: campaign.unsubscribed,
          openRate: `${openRate}%`,
          clickRate: `${clickRate}%`,
          conversionRate: `${conversionRate}%`,
          revenue: campaign.revenue || 0,
          roi: campaign.roi || 0,
        },
      });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to get campaign analytics' });
    }
  }
  
  // ============================================
  // WORKFLOW AUTOMATION
  // ============================================
  
  async createWorkflow(organizationId: string, userId: string, args: FunctionArgs): Promise<string> {
    try {
      if (!args.name || !args.trigger || !args.actions) {
        return JSON.stringify({ error: 'name, trigger, and actions are required' });
      }
      
      // Parse trigger type
      const triggerType = args.trigger.toLowerCase().includes('lead') ? 'LEAD_CREATED' : 
                         args.trigger.toLowerCase().includes('status') ? 'LEAD_STATUS_CHANGED' :
                         args.trigger.toLowerCase().includes('score') ? 'LEAD_SCORE_CHANGED' :
                         'LEAD_CREATED';
      
      // Parse actions (convert string to JSON array)
      let actionsJson;
      try {
        actionsJson = typeof args.actions === 'string' ? JSON.parse(args.actions) : args.actions;
      } catch {
        // If parsing fails, create simple action array
        actionsJson = [{ type: 'SEND_EMAIL', data: args.actions }];
      }
      
      const workflow = await prisma.workflow.create({
        data: {
          name: args.name,
          description: args.description || `Automated workflow: ${args.name}`,
          isActive: false, // Start inactive for safety
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          triggerType: triggerType as any,
          triggerData: {},
          actions: actionsJson,
          organizationId,
        },
      });
      
      return JSON.stringify({
        success: true,
        workflow: {
          id: workflow.id,
          name: workflow.name,
          isActive: workflow.isActive,
          triggerType: workflow.triggerType,
        },
        message: `✅ Created workflow: ${workflow.name} (inactive - use toggle_workflow to activate)`,
      });
    } catch (error) {
      logger.error('Create workflow error:', error);
      return JSON.stringify({ error: 'Failed to create workflow' });
    }
  }
  
  async updateWorkflow(organizationId: string, args: FunctionArgs): Promise<string> {
    try {
      if (!args.workflowId) {
        return JSON.stringify({ error: 'workflowId is required' });
      }
      
      const updateData: Record<string, unknown> = {};
      if (args.name) updateData.name = args.name;
      if (args.description) updateData.description = args.description;
      if (args.trigger) {
        const triggerType = args.trigger.toLowerCase().includes('lead') ? 'LEAD_CREATED' : 
                           args.trigger.toLowerCase().includes('status') ? 'LEAD_STATUS_CHANGED' :
                           args.trigger.toLowerCase().includes('score') ? 'LEAD_SCORE_CHANGED' : null;
        if (triggerType) updateData.triggerType = triggerType;
      }
      if (args.actions) {
        try {
          updateData.actions = typeof args.actions === 'string' ? JSON.parse(args.actions) : args.actions;
        } catch {
          updateData.actions = [{ type: 'SEND_EMAIL', data: args.actions }];
        }
      }
      
      const workflow = await prisma.workflow.update({
        where: { id: args.workflowId, organizationId },
        data: updateData,
      });
      
      return JSON.stringify({
        success: true,
        message: `✅ Updated workflow: ${workflow.name}`,
      });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to update workflow' });
    }
  }
  
  async deleteWorkflow(organizationId: string, args: FunctionArgs): Promise<string> {
    try {
      if (!args.workflowId) {
        return JSON.stringify({ error: 'workflowId is required' });
      }
      
      const workflow = await prisma.workflow.findFirst({
        where: { id: args.workflowId, organizationId },
      });
      
      if (!workflow) {
        return JSON.stringify({ error: 'Workflow not found' });
      }
      
      await prisma.workflow.delete({
        where: { id: args.workflowId },
      });
      
      return JSON.stringify({
        success: true,
        message: `✅ Deleted workflow: ${workflow.name}`,
      });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to delete workflow' });
    }
  }
  
  async toggleWorkflow(organizationId: string, args: FunctionArgs): Promise<string> {
    try {
      if (!args.workflowId) {
        return JSON.stringify({ error: 'workflowId is required' });
      }
      
      const active = args.active !== undefined ? args.active : true;
      
      const workflow = await prisma.workflow.update({
        where: { id: args.workflowId, organizationId },
        data: { isActive: active },
      });
      
      return JSON.stringify({
        success: true,
        message: workflow.isActive 
          ? `✅ Activated workflow: ${workflow.name}` 
          : `⏸️ Deactivated workflow: ${workflow.name}`,
      });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to toggle workflow' });
    }
  }
  
  async triggerWorkflow(organizationId: string, args: FunctionArgs): Promise<string> {
    try {
      if (!args.workflowId || !args.leadId) {
        return JSON.stringify({ error: 'workflowId and leadId are required' });
      }
      
      const workflow = await prisma.workflow.findFirst({
        where: { id: args.workflowId, organizationId },
      });
      
      if (!workflow) {
        return JSON.stringify({ error: 'Workflow not found' });
      }
      
      // Create workflow execution record
      const execution = await prisma.workflowExecution.create({
        data: {
          workflowId: args.workflowId,
          status: 'SUCCESS',
          leadId: args.leadId,
          metadata: { triggeredManually: true },
          completedAt: new Date(),
        },
      });
      
      // Update workflow execution count
      await prisma.workflow.update({
        where: { id: args.workflowId },
        data: {
          executions: { increment: 1 },
          lastRunAt: new Date(),
        },
      });
      
      return JSON.stringify({
        success: true,
        execution: { id: execution.id, status: execution.status },
        message: `🚀 Triggered workflow: ${workflow.name}`,
      });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to trigger workflow' });
    }
  }
  
  // ============================================
  // TEMPLATE MANAGEMENT
  // ============================================
  
  async createEmailTemplate(organizationId: string, userId: string, args: FunctionArgs): Promise<string> {
    try {
      if (!args.name || !args.subject || !args.body) {
        return JSON.stringify({ error: 'name, subject, and body are required' });
      }
      
      const template = await prisma.emailTemplate.create({
        data: {
          name: args.name,
          subject: args.subject,
          body: args.body,
          category: args.category || 'general',
          organizationId,
        },
      });
      
      return JSON.stringify({
        success: true,
        template: { id: template.id, name: template.name }
      });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to create email template' });
    }
  }
  
  async createSMSTemplate(organizationId: string, userId: string, args: FunctionArgs): Promise<string> {
    try {
      if (!args.name || !args.content) {
        return JSON.stringify({ error: 'name and content are required' });
      }
      
      const template = await prisma.sMSTemplate.create({
        data: {
          name: args.name,
          body: args.content || '',
          category: args.category || 'general',
          organizationId,
        },
      });
      
      return JSON.stringify({
        success: true,
        template: { id: template.id, name: template.name }
      });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to create SMS template' });
    }
  }
  
  async deleteEmailTemplate(organizationId: string, args: FunctionArgs): Promise<string> {
    try {
      if (!args.templateId) return JSON.stringify({ error: 'templateId is required' });
      
      await prisma.emailTemplate.delete({
        where: { id: args.templateId, organizationId },
      });
      
      return JSON.stringify({ success: true, message: 'Email template deleted' });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to delete email template' });
    }
  }
  
  async deleteSMSTemplate(organizationId: string, args: FunctionArgs): Promise<string> {
    try {
      if (!args.templateId) return JSON.stringify({ error: 'templateId is required' });
      
      await prisma.sMSTemplate.delete({
        where: { id: args.templateId, organizationId },
      });
      
      return JSON.stringify({ success: true, message: 'SMS template deleted' });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to delete SMS template' });
    }
  }
  
  // ============================================
  // BULK OPERATIONS
  // ============================================
  
  async bulkUpdateLeads(organizationId: string, args: FunctionArgs): Promise<string> {
    try {
      if (!args.leadIds || args.leadIds.length === 0) {
        return JSON.stringify({ error: 'leadIds array is required' });
      }
      
      const updates = args.updates || {};
      
      await prisma.lead.updateMany({
        where: {
          id: { in: args.leadIds },
          organizationId,
        },
        data: updates,
      });
      
      return JSON.stringify({
        success: true,
        message: `Updated ${args.leadIds.length} leads`,
        count: args.leadIds.length
      });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to bulk update leads' });
    }
  }
  
  async bulkDeleteLeads(organizationId: string, args: FunctionArgs): Promise<string> {
    try {
      if (!args.leadIds || args.leadIds.length === 0) {
        return JSON.stringify({ error: 'leadIds array is required' });
      }
      
      await prisma.lead.deleteMany({
        where: {
          id: { in: args.leadIds },
          organizationId,
        },
      });
      
      return JSON.stringify({
        success: true,
        message: `Deleted ${args.leadIds.length} leads`,
        count: args.leadIds.length
      });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to bulk delete leads' });
    }
  }
  
  // ============================================
  // ANALYTICS & REPORTING
  // ============================================
  
  async getDashboardStats(organizationId: string, _args: FunctionArgs): Promise<string> {
    try {
      const [leadsCount, tasksCount, appointmentsCount] = await Promise.all([
        prisma.lead.count({ where: { organizationId } }),
        prisma.task.count({}),
        prisma.appointment.count({ where: { organizationId } }),
      ]);
      
      return JSON.stringify({
        success: true,
        stats: {
          leads: leadsCount,
          tasks: tasksCount,
          appointments: appointmentsCount
        }
      });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to get dashboard stats' });
    }
  }
  
  async getLeadAnalytics(organizationId: string, args: FunctionArgs): Promise<string> {
    try {
      const timeRange = args.timeRange || 'month';
      const daysAgo = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 
                      timeRange === 'quarter' ? 90 : timeRange === 'year' ? 365 : 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);
      
      const [total, newLeads, byStatus, avgScore, topSources] = await Promise.all([
        prisma.lead.count({ where: { organizationId } }),
        prisma.lead.count({ 
          where: { organizationId, createdAt: { gte: startDate } } 
        }),
        prisma.lead.groupBy({
          by: ['status'],
          where: { organizationId },
          _count: true,
        }),
        prisma.lead.aggregate({
          where: { organizationId },
          _avg: { score: true },
        }),
        prisma.lead.groupBy({
          by: ['source'],
          where: { organizationId, source: { not: null } },
          _count: true,
          orderBy: { _count: { source: 'desc' } },
          take: 5,
        }),
      ]);
      
      const statusBreakdown = byStatus.reduce<Record<string, number>>((acc, item) => {
        acc[item.status] = item._count;
        return acc;
      }, {});
      
      return JSON.stringify({
        success: true,
        analytics: {
          timeRange,
          totalLeads: total,
          newLeads,
          averageScore: avgScore._avg.score ? Math.round(avgScore._avg.score) : 0,
          statusBreakdown,
          topSources: topSources.map(s => ({
            source: s.source,
            count: s._count,
          })),
        },
      });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to get lead analytics' });
    }
  }
  
  async getConversionFunnel(organizationId: string, args: FunctionArgs): Promise<string> {
    try {
      const timeRange = args.timeRange || 'month';
      const daysAgo = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 
                      timeRange === 'quarter' ? 90 : timeRange === 'year' ? 365 : 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);
      
      const [total, contacted, qualified, converted] = await Promise.all([
        prisma.lead.count({ 
          where: { organizationId, createdAt: { gte: startDate } } 
        }),
        prisma.lead.count({ 
          where: { 
            organizationId, 
            createdAt: { gte: startDate },
            status: { in: ['CONTACTED', 'QUALIFIED', 'WON'] }
          } 
        }),
        prisma.lead.count({ 
          where: { 
            organizationId, 
            createdAt: { gte: startDate },
            status: { in: ['QUALIFIED', 'WON'] }
          } 
        }),
        prisma.lead.count({ 
          where: { 
            organizationId, 
            createdAt: { gte: startDate },
            status: 'WON'
          } 
        }),
      ]);
      
      const contactedRate = formatRate(calcRate(contacted, total));
      const qualifiedRate = formatRate(calcRate(qualified, contacted));
      const convertedRate = formatRate(calcRate(converted, qualified));
      const overallRate = formatRate(calcRate(converted, total));
      
      return JSON.stringify({
        success: true,
        funnel: {
          timeRange,
          stages: [
            { name: 'New Leads', count: total, rate: '100%' },
            { name: 'Contacted', count: contacted, rate: `${contactedRate}%` },
            { name: 'Qualified', count: qualified, rate: `${qualifiedRate}%` },
            { name: 'Converted', count: converted, rate: `${convertedRate}%` },
          ],
          overallConversionRate: `${overallRate}%`,
        },
      });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to get conversion funnel' });
    }
  }
  
  // ============================================
  // INTEGRATION MANAGEMENT
  // ============================================
  
  async connectIntegration(organizationId: string, args: FunctionArgs): Promise<string> {
    try {
      if (!args.provider || !args.apiKey) {
        return JSON.stringify({ error: 'provider and apiKey are required' });
      }
      
      // Get user from organization (use first admin)
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        include: { users: { take: 1 } },
      });
      
      if (!org || !org.users[0]) {
        return JSON.stringify({ error: 'Organization or user not found' });
      }
      
      const userId = org.users[0].id;
      const provider = args.provider.toLowerCase();
      
      // Check if integration already exists
      const existing = await prisma.integration.findFirst({
        where: { userId, provider },
      });
      
      if (existing) {
        // Update existing
        const integration = await prisma.integration.update({
          where: { id: existing.id },
          data: {
            isConnected: true,
            credentials: { apiKey: args.apiKey },
            config: (args.additionalConfig || {}) as Record<string, string>,
            lastSyncAt: new Date(),
            syncStatus: 'CONNECTED',
          },
        });
        
        return JSON.stringify({
          success: true,
          integration: { id: integration.id, provider: integration.provider },
          message: `✅ Updated ${provider} integration`,
        });
      } else {
        // Create new
        const integration = await prisma.integration.create({
          data: {
            userId,
            organizationId,
            provider,
            isConnected: true,
            credentials: { apiKey: args.apiKey },
            config: (args.additionalConfig || {}) as Record<string, string>,
            lastSyncAt: new Date(),
            syncStatus: 'CONNECTED',
          },
        });
        
        return JSON.stringify({
          success: true,
          integration: { id: integration.id, provider: integration.provider },
          message: `✅ Connected ${provider} integration`,
        });
      }
    } catch (error) {
      logger.error('Connect integration error:', error);
      return JSON.stringify({ error: 'Failed to connect integration' });
    }
  }
  
  async disconnectIntegration(organizationId: string, args: FunctionArgs): Promise<string> {
    try {
      if (!args.provider) {
        return JSON.stringify({ error: 'provider is required' });
      }
      
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        include: { users: { take: 1 } },
      });
      
      if (!org || !org.users[0]) {
        return JSON.stringify({ error: 'Organization not found' });
      }
      
      const userId = org.users[0].id;
      const provider = args.provider.toLowerCase();
      
      const integration = await prisma.integration.findFirst({
        where: { userId, provider },
      });
      
      if (!integration) {
        return JSON.stringify({ error: 'Integration not found' });
      }
      
      await prisma.integration.update({
        where: { id: integration.id },
        data: {
          isConnected: false,
          syncStatus: 'DISCONNECTED',
        },
      });
      
      return JSON.stringify({
        success: true,
        message: `✅ Disconnected ${provider} integration`,
      });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to disconnect integration' });
    }
  }
  
  async syncIntegration(organizationId: string, args: FunctionArgs): Promise<string> {
    try {
      if (!args.provider) {
        return JSON.stringify({ error: 'provider is required' });
      }
      
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        include: { users: { take: 1 } },
      });
      
      if (!org || !org.users[0]) {
        return JSON.stringify({ error: 'Organization not found' });
      }
      
      const userId = org.users[0].id;
      const provider = args.provider.toLowerCase();
      
      const integration = await prisma.integration.findFirst({
        where: { userId, provider },
      });
      
      if (!integration) {
        return JSON.stringify({ error: 'Integration not found' });
      }
      
      if (!integration.isConnected) {
        return JSON.stringify({ error: 'Integration is not connected' });
      }
      
      await prisma.integration.update({
        where: { id: integration.id },
        data: {
          lastSyncAt: new Date(),
          syncStatus: 'SYNCED',
          syncError: null,
        },
      });
      
      return JSON.stringify({
        success: true,
        message: `✅ Synced ${provider} integration`,
        lastSyncAt: new Date().toISOString(),
      });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to sync integration' });
    }
  }

  // ============================================
  // PIPELINE MANAGEMENT
  // ============================================

  async getPipelines(organizationId: string): Promise<string> {
    try {
      const pipelines = await prisma.pipeline.findMany({
        where: { organizationId },
        include: {
          stages: { orderBy: { order: 'asc' } },
          _count: { select: { leads: true } },
        },
      });

      return JSON.stringify({
        success: true,
        pipelines: pipelines.map(p => ({
          id: p.id,
          name: p.name,
          type: p.type,
          isDefault: p.isDefault,
          leadCount: p._count.leads,
          stages: p.stages.map(s => ({ id: s.id, name: s.name, order: s.order, color: s.color })),
        })),
        count: pipelines.length,
      });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to get pipelines' });
    }
  }

  async createPipeline(organizationId: string, args: FunctionArgs): Promise<string> {
    try {
      if (!args.name) return JSON.stringify({ error: 'name is required' });

      const pipeline = await prisma.pipeline.create({
        data: {
          name: args.name,
          description: args.description || '',
          organizationId,
        },
      });

      // Create stages if provided
      const stageNames = args.stages || ['New', 'Contacted', 'Qualified', 'Proposal', 'Won'];
      for (let i = 0; i < stageNames.length; i++) {
        await prisma.pipelineStage.create({
          data: {
            name: stageNames[i],
            order: i,
            pipelineId: pipeline.id,
            isWinStage: i === stageNames.length - 1,
          },
        });
      }

      return JSON.stringify({
        success: true,
        pipeline: { id: pipeline.id, name: pipeline.name },
        message: `✅ Created pipeline: ${pipeline.name} with ${stageNames.length} stages`,
      });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to create pipeline' });
    }
  }

  async moveLeadToStage(organizationId: string, args: FunctionArgs): Promise<string> {
    try {
      if (!args.leadId) return JSON.stringify({ error: 'leadId is required' });

      const lead = await prisma.lead.findFirst({
        where: { id: args.leadId, organizationId },
      });
      if (!lead) return JSON.stringify({ error: 'Lead not found' });

      let stageId = args.stageId;

      // If stageName provided instead of stageId, look it up
      if (!stageId && args.stageName) {
        const pipelineId = args.pipelineId || lead.pipelineId;
        if (!pipelineId) {
          // Use default pipeline
          const defaultPipeline = await prisma.pipeline.findFirst({
            where: { organizationId, isDefault: true },
            include: { stages: true },
          });
          if (!defaultPipeline) return JSON.stringify({ error: 'No default pipeline found' });
          const stage = defaultPipeline.stages.find(
            s => s.name.toLowerCase() === args.stageName!.toLowerCase()
          );
          if (!stage) return JSON.stringify({ error: `Stage "${args.stageName}" not found` });
          stageId = stage.id;
        } else {
          const stage = await prisma.pipelineStage.findFirst({
            where: { pipelineId, name: { equals: args.stageName, mode: 'insensitive' } },
          });
          if (!stage) return JSON.stringify({ error: `Stage "${args.stageName}" not found` });
          stageId = stage.id;
        }
      }

      if (!stageId) return JSON.stringify({ error: 'stageId or stageName required' });

      await prisma.lead.update({
        where: { id: args.leadId },
        data: { pipelineStageId: stageId },
      });

      return JSON.stringify({
        success: true,
        message: `✅ Moved ${lead.firstName} ${lead.lastName} to new stage`,
      });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to move lead' });
    }
  }

  async getPipelineLeads(organizationId: string, args: FunctionArgs): Promise<string> {
    try {
      let pipelineId = args.pipelineId;
      if (!pipelineId) {
        const defaultPipeline = await prisma.pipeline.findFirst({
          where: { organizationId, isDefault: true },
        });
        if (!defaultPipeline) return JSON.stringify({ error: 'No default pipeline found' });
        pipelineId = defaultPipeline.id;
      }

      const stages = await prisma.pipelineStage.findMany({
        where: { pipelineId },
        orderBy: { order: 'asc' },
        include: {
          leads: {
            where: { organizationId },
            select: { id: true, firstName: true, lastName: true, score: true, status: true },
            take: 20,
          },
        },
      });

      return JSON.stringify({
        success: true,
        stages: stages.map(s => ({
          name: s.name,
          leadCount: s.leads.length,
          leads: s.leads.map(l => ({
            id: l.id,
            name: `${l.firstName} ${l.lastName}`,
            score: l.score,
            status: l.status,
          })),
        })),
      });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to get pipeline leads' });
    }
  }

  // ============================================
  // GOAL TRACKING
  // ============================================

  async createGoal(organizationId: string, userId: string, args: FunctionArgs): Promise<string> {
    try {
      if (!args.name || !args.metricType || args.targetValue === undefined) {
        return JSON.stringify({ error: 'name, metricType, and targetValue are required' });
      }

      const now = new Date();
      const period = args.period || 'MONTHLY';
      let endDate: Date;
      if (args.endDate) {
        endDate = new Date(args.endDate);
      } else {
        endDate = new Date(now);
        if (period === 'DAILY') endDate.setDate(endDate.getDate() + 1);
        else if (period === 'WEEKLY') endDate.setDate(endDate.getDate() + 7);
        else if (period === 'MONTHLY') endDate.setMonth(endDate.getMonth() + 1);
        else if (period === 'QUARTERLY') endDate.setMonth(endDate.getMonth() + 3);
        else endDate.setFullYear(endDate.getFullYear() + 1);
      }

      const goal = await prisma.goal.create({
        data: {
          name: args.name,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          metricType: args.metricType as any,
          targetValue: args.targetValue,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          period: period as any,
          startDate: args.startDate ? new Date(args.startDate) : now,
          endDate,
          notes: args.notes || null,
          userId,
          organizationId,
        },
      });

      return JSON.stringify({
        success: true,
        goal: { id: goal.id, name: goal.name, targetValue: goal.targetValue, period: goal.period },
        message: `✅ Created goal: ${goal.name} (Target: ${goal.targetValue})`,
      });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to create goal' });
    }
  }

  async listGoals(organizationId: string, userId: string, args: FunctionArgs): Promise<string> {
    try {
      const activeOnly = args.activeOnly !== false;
      const where: Prisma.GoalWhereInput = { organizationId, userId };
      if (activeOnly) where.isActive = true;

      const goals = await prisma.goal.findMany({
        where,
        orderBy: { endDate: 'asc' },
      });

      return JSON.stringify({
        success: true,
        goals: goals.map(g => ({
          id: g.id,
          name: g.name,
          metricType: g.metricType,
          targetValue: g.targetValue,
          currentValue: g.currentValue,
          progress: g.targetValue > 0 ? Math.round((g.currentValue / g.targetValue) * 100) : 0,
          period: g.period,
          endDate: g.endDate.toISOString().split('T')[0],
          isActive: g.isActive,
        })),
        count: goals.length,
      });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to list goals' });
    }
  }

  async updateGoal(organizationId: string, args: FunctionArgs): Promise<string> {
    try {
      if (!args.goalId) return JSON.stringify({ error: 'goalId is required' });

      const updateData: Record<string, unknown> = {};
      if (args.name) updateData.name = args.name;
      if (args.targetValue !== undefined) updateData.targetValue = args.targetValue;
      if (args.currentValue !== undefined) updateData.currentValue = args.currentValue;
      if (args.isActive !== undefined) updateData.isActive = args.isActive;
      if (args.notes) updateData.notes = args.notes;

      const goal = await prisma.goal.update({
        where: { id: args.goalId },
        data: updateData,
      });

      return JSON.stringify({
        success: true,
        message: `✅ Updated goal: ${goal.name}`,
        goal: { id: goal.id, name: goal.name, targetValue: goal.targetValue, currentValue: goal.currentValue },
      });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to update goal' });
    }
  }

  async deleteGoal(organizationId: string, args: FunctionArgs): Promise<string> {
    try {
      if (!args.goalId) return JSON.stringify({ error: 'goalId is required' });

      const goal = await prisma.goal.findFirst({ where: { id: args.goalId, organizationId } });
      if (!goal) return JSON.stringify({ error: 'Goal not found' });

      await prisma.goal.delete({ where: { id: args.goalId } });

      return JSON.stringify({ success: true, message: `✅ Deleted goal: ${goal.name}` });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to delete goal' });
    }
  }

  // ============================================
  // CALL LOGGING
  // ============================================

  async logCall(organizationId: string, userId: string, args: FunctionArgs): Promise<string> {
    try {
      if (!args.leadId || !args.direction || !args.phoneNumber) {
        return JSON.stringify({ error: 'leadId, direction, and phoneNumber are required' });
      }

      const lead = await prisma.lead.findFirst({ where: { id: args.leadId, organizationId } });
      if (!lead) return JSON.stringify({ error: 'Lead not found' });

      const call = await prisma.call.create({
        data: {
          organizationId,
          leadId: args.leadId,
          calledById: userId,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          direction: args.direction as any,
          phoneNumber: args.phoneNumber,
          status: 'COMPLETED',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          outcome: (args.outcome || 'ANSWERED') as any,
          duration: typeof args.duration === 'number' ? args.duration : undefined,
          notes: args.notes || null,
          followUpDate: args.followUpDate ? new Date(args.followUpDate) : undefined,
        },
      });

      // Log activity
      await prisma.activity.create({
        data: {
          type: 'CALL_MADE',
          title: `${args.direction} Call`,
          description: `${args.direction} call to ${lead.firstName} ${lead.lastName}${args.outcome ? ` - ${args.outcome}` : ''}`,
          leadId: args.leadId,
          organizationId,
          userId,
        },
      });

      return JSON.stringify({
        success: true,
        call: { id: call.id, direction: call.direction, outcome: call.outcome },
        message: `✅ Logged ${args.direction.toLowerCase()} call with ${lead.firstName} ${lead.lastName}`,
      });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to log call' });
    }
  }

  async getCallStats(organizationId: string, args: FunctionArgs): Promise<string> {
    try {
      const timeRange = args.timeRange || 'month';
      const daysAgo = timeRange === 'today' ? 1 : timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      const [total, answered, voicemail, noAnswer, avgDuration] = await Promise.all([
        prisma.call.count({ where: { organizationId, createdAt: { gte: startDate } } }),
        prisma.call.count({ where: { organizationId, createdAt: { gte: startDate }, outcome: 'ANSWERED' } }),
        prisma.call.count({ where: { organizationId, createdAt: { gte: startDate }, outcome: 'VOICEMAIL' } }),
        prisma.call.count({ where: { organizationId, createdAt: { gte: startDate }, outcome: 'NO_ANSWER' } }),
        prisma.call.aggregate({ where: { organizationId, createdAt: { gte: startDate } }, _avg: { duration: true } }),
      ]);

      return JSON.stringify({
        success: true,
        stats: {
          timeRange,
          totalCalls: total,
          answered,
          voicemail,
          noAnswer,
          avgDurationSeconds: avgDuration._avg.duration ? Math.round(avgDuration._avg.duration) : 0,
          answerRate: total > 0 ? `${Math.round((answered / total) * 100)}%` : '0%',
        },
      });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to get call stats' });
    }
  }

  async getCalls(organizationId: string, args: FunctionArgs): Promise<string> {
    try {
      const where: Prisma.CallWhereInput = { organizationId };
      if (args.leadId) where.leadId = args.leadId;

      const calls = await prisma.call.findMany({
        where,
        take: args.limit || 20,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, direction: true, phoneNumber: true, status: true, outcome: true,
          duration: true, notes: true, createdAt: true,
          lead: { select: { firstName: true, lastName: true } },
        },
      });

      return JSON.stringify({
        success: true,
        calls: calls.map(c => ({
          id: c.id,
          direction: c.direction,
          phoneNumber: c.phoneNumber,
          outcome: c.outcome,
          duration: c.duration,
          notes: c.notes,
          leadName: c.lead ? `${c.lead.firstName} ${c.lead.lastName}` : null,
          date: c.createdAt,
        })),
        count: calls.length,
      });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to get calls' });
    }
  }

  // ============================================
  // NOTIFICATIONS
  // ============================================

  async getNotifications(organizationId: string, userId: string, args: FunctionArgs): Promise<string> {
    try {
      const where: Prisma.NotificationWhereInput = { userId, organizationId };
      if (args.unreadOnly) where.read = false;

      const notifications = await prisma.notification.findMany({
        where,
        take: args.limit || 20,
        orderBy: { createdAt: 'desc' },
        select: { id: true, type: true, title: true, message: true, read: true, link: true, createdAt: true },
      });

      return JSON.stringify({
        success: true,
        notifications,
        count: notifications.length,
      });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to get notifications' });
    }
  }

  async getUnreadNotificationCount(organizationId: string, userId: string): Promise<string> {
    try {
      const count = await prisma.notification.count({
        where: { userId, organizationId, read: false },
      });

      return JSON.stringify({ success: true, unreadCount: count });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to get unread count' });
    }
  }

  async markNotificationsRead(organizationId: string, userId: string): Promise<string> {
    try {
      const result = await prisma.notification.updateMany({
        where: { userId, organizationId, read: false },
        data: { read: true },
      });

      return JSON.stringify({
        success: true,
        message: `✅ Marked ${result.count} notifications as read`,
      });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to mark notifications read' });
    }
  }

  // ============================================
  // LIST/SEARCH FUNCTIONS
  // ============================================

  async listCampaigns(organizationId: string, args: FunctionArgs): Promise<string> {
    try {
      const where: Prisma.CampaignWhereInput = { organizationId };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (args.status) where.status = args.status as any;

      const campaigns = await prisma.campaign.findMany({
        where,
        take: args.limit || 20,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, name: true, type: true, status: true, sent: true, opened: true,
          clicked: true, createdAt: true,
        },
      });

      return JSON.stringify({
        success: true,
        campaigns: campaigns.map(c => ({
          id: c.id,
          name: c.name,
          type: c.type,
          status: c.status,
          sent: c.sent,
          opened: c.opened,
          clicked: c.clicked,
        })),
        count: campaigns.length,
      });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to list campaigns' });
    }
  }

  async listWorkflows(organizationId: string, args: FunctionArgs): Promise<string> {
    try {
      const where: Prisma.WorkflowWhereInput = { organizationId };
      if (args.activeOnly) where.isActive = true;

      const workflows = await prisma.workflow.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, name: true, description: true, isActive: true, triggerType: true,
          executions: true, lastRunAt: true,
        },
      });

      return JSON.stringify({
        success: true,
        workflows: workflows.map(w => ({
          id: w.id,
          name: w.name,
          description: w.description,
          isActive: w.isActive,
          triggerType: w.triggerType,
          executions: w.executions,
          lastRunAt: w.lastRunAt,
        })),
        count: workflows.length,
      });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to list workflows' });
    }
  }

  async listTasks(organizationId: string, userId: string, args: FunctionArgs): Promise<string> {
    try {
      const where: Prisma.TaskWhereInput = { organizationId };
      if (args.leadId) where.leadId = args.leadId;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (args.status) where.status = args.status as any;

      const tasks = await prisma.task.findMany({
        where,
        take: args.limit || 20,
        orderBy: { dueDate: 'asc' },
        select: {
          id: true, title: true, description: true, dueDate: true, priority: true,
          status: true, completedAt: true,
          lead: { select: { firstName: true, lastName: true } },
        },
      });

      return JSON.stringify({
        success: true,
        tasks: tasks.map(t => ({
          id: t.id,
          title: t.title,
          description: t.description,
          dueDate: t.dueDate,
          priority: t.priority,
          status: t.status,
          completed: !!t.completedAt,
          leadName: t.lead ? `${t.lead.firstName} ${t.lead.lastName}` : null,
        })),
        count: tasks.length,
      });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to list tasks' });
    }
  }

  async listEmailTemplates(organizationId: string, args: FunctionArgs): Promise<string> {
    try {
      const where: Prisma.EmailTemplateWhereInput = { organizationId };
      if (args.category) where.category = args.category;

      const templates = await prisma.emailTemplate.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, subject: true, category: true },
      });

      return JSON.stringify({
        success: true,
        templates,
        count: templates.length,
      });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to list email templates' });
    }
  }

  async listSMSTemplates(organizationId: string, args: FunctionArgs): Promise<string> {
    try {
      const where: Prisma.SMSTemplateWhereInput = { organizationId };
      if (args.category) where.category = args.category;

      const templates = await prisma.sMSTemplate.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, body: true, category: true },
      });

      return JSON.stringify({
        success: true,
        templates,
        count: templates.length,
      });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to list SMS templates' });
    }
  }

  // ============================================
  // CUSTOM FIELDS
  // ============================================

  async getCustomFields(organizationId: string): Promise<string> {
    try {
      const fields = await prisma.customFieldDefinition.findMany({
        where: { organizationId },
        orderBy: { order: 'asc' },
      });

      return JSON.stringify({
        success: true,
        fields: fields.map(f => ({
          id: f.id,
          name: f.name,
          fieldKey: f.fieldKey,
          type: f.type,
          required: f.required,
          options: f.options,
          placeholder: f.placeholder,
        })),
        count: fields.length,
      });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to get custom fields' });
    }
  }

  async createCustomField(organizationId: string, args: FunctionArgs): Promise<string> {
    try {
      if (!args.name || !args.type) return JSON.stringify({ error: 'name and type are required' });

      const fieldKey = args.fieldKey || args.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');

      const field = await prisma.customFieldDefinition.create({
        data: {
          name: args.name,
          fieldKey,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          type: (args.type === 'SELECT' || args.type === 'MULTI_SELECT' ? 'DROPDOWN' : args.type) as any,
          required: !!args.required,
          options: args.options ? args.options : undefined,
          placeholder: args.placeholder || null,
          organizationId,
        },
      });

      return JSON.stringify({
        success: true,
        field: { id: field.id, name: field.name, fieldKey: field.fieldKey, type: field.type },
        message: `✅ Created custom field: ${field.name}`,
      });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to create custom field' });
    }
  }

  async deleteCustomField(organizationId: string, args: FunctionArgs): Promise<string> {
    try {
      if (!args.fieldId) return JSON.stringify({ error: 'fieldId is required' });

      await prisma.customFieldDefinition.delete({
        where: { id: args.fieldId, organizationId },
      });

      return JSON.stringify({ success: true, message: '✅ Custom field deleted' });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to delete custom field' });
    }
  }

  // ============================================
  // EXPORT DATA
  // ============================================

  async exportData(organizationId: string, args: FunctionArgs): Promise<string> {
    try {
      if (!args.type) return JSON.stringify({ error: 'type is required' });

      const exportType = args.type;
      let data: unknown[];

      if (exportType === 'leads') {
        data = await prisma.lead.findMany({
          where: { organizationId },
          select: { id: true, firstName: true, lastName: true, email: true, phone: true, status: true, score: true, source: true, createdAt: true },
          take: 1000,
        });
      } else if (exportType === 'activities') {
        data = await prisma.activity.findMany({
          where: { organizationId },
          select: { id: true, type: true, title: true, description: true, createdAt: true },
          take: 1000,
        });
      } else if (exportType === 'campaigns') {
        data = await prisma.campaign.findMany({
          where: { organizationId },
          select: { id: true, name: true, type: true, status: true, sent: true, opened: true, clicked: true, createdAt: true },
        });
      } else if (exportType === 'tasks') {
        data = await prisma.task.findMany({
          where: { organizationId },
          select: { id: true, title: true, status: true, priority: true, dueDate: true, completedAt: true },
          take: 1000,
        });
      } else {
        return JSON.stringify({ error: `Unknown export type: ${exportType}` });
      }

      if (args.format === 'json') {
        return JSON.stringify({
          success: true,
          exportType,
          format: 'json',
          data,
          count: data.length,
          message: `✅ Exported ${data.length} ${exportType} records as JSON`,
        });
      }

      // CSV format
      if (data.length === 0) {
        return JSON.stringify({ success: true, csv: '', count: 0, message: 'No data to export' });
      }

      const headers = Object.keys(data[0] as Record<string, unknown>);
      const csvRows = [
        headers.join(','),
        ...data.map(row => headers.map(h => {
          const val = (row as Record<string, unknown>)[h];
          return typeof val === 'string' && val.includes(',') ? `"${val}"` : String(val ?? '');
        }).join(',')),
      ];

      return JSON.stringify({
        success: true,
        exportType,
        format: 'csv',
        csv: csvRows.join('\n'),
        count: data.length,
        message: `✅ Exported ${data.length} ${exportType} records as CSV`,
      });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to export data' });
    }
  }

  // ============================================
  // SAVED FILTERS & REPORTS
  // ============================================

  async listSavedFilters(organizationId: string, userId: string): Promise<string> {
    try {
      const filters = await prisma.savedFilterView.findMany({
        where: { organizationId, OR: [{ userId }, { isShared: true }] },
        orderBy: { createdAt: 'desc' },
      });

      return JSON.stringify({
        success: true,
        filters: filters.map(f => ({
          id: f.id,
          name: f.name,
          icon: f.icon,
          color: f.color,
          isDefault: f.isDefault,
          isShared: f.isShared,
        })),
        count: filters.length,
      });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to list saved filters' });
    }
  }

  async createSavedFilter(organizationId: string, userId: string, args: FunctionArgs): Promise<string> {
    try {
      if (!args.name || !args.filterConfig) {
        return JSON.stringify({ error: 'name and filterConfig are required' });
      }

      const filter = await prisma.savedFilterView.create({
        data: {
          name: args.name,
          filterConfig: args.filterConfig as Prisma.InputJsonValue,
          color: args.color || null,
          icon: args.icon || null,
          userId,
          organizationId,
        },
      });

      return JSON.stringify({
        success: true,
        filter: { id: filter.id, name: filter.name },
        message: `✅ Created saved filter: ${filter.name}`,
      });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to create saved filter' });
    }
  }

  async deleteSavedFilter(organizationId: string, args: FunctionArgs): Promise<string> {
    try {
      if (!args.filterId) return JSON.stringify({ error: 'filterId is required' });

      await prisma.savedFilterView.delete({ where: { id: args.filterId } });

      return JSON.stringify({ success: true, message: '✅ Saved filter deleted' });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to delete saved filter' });
    }
  }

  async listSavedReports(organizationId: string, _userId: string): Promise<string> {
    try {
      const reports = await prisma.savedReport.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, description: true, type: true, createdAt: true },
      });

      return JSON.stringify({
        success: true,
        reports,
        count: reports.length,
      });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to list saved reports' });
    }
  }

  async createSavedReport(organizationId: string, userId: string, args: FunctionArgs): Promise<string> {
    try {
      if (!args.name || !args.type || !args.config) {
        return JSON.stringify({ error: 'name, type, and config are required' });
      }

      const report = await prisma.savedReport.create({
        data: {
          name: args.name,
          description: args.description || null,
          type: args.type,
          config: args.config as Prisma.InputJsonValue,
          userId,
          organizationId,
        },
      });

      return JSON.stringify({
        success: true,
        report: { id: report.id, name: report.name },
        message: `✅ Created saved report: ${report.name}`,
      });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to create saved report' });
    }
  }

  async deleteSavedReport(organizationId: string, args: FunctionArgs): Promise<string> {
    try {
      if (!args.reportId) return JSON.stringify({ error: 'reportId is required' });

      await prisma.savedReport.delete({ where: { id: args.reportId } });

      return JSON.stringify({ success: true, message: '✅ Saved report deleted' });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to delete saved report' });
    }
  }

  // ============================================
  // TEAM & SETTINGS
  // ============================================

  async listTeamMembers(organizationId: string): Promise<string> {
    try {
      const members = await prisma.user.findMany({
        where: { organizationId },
        select: { id: true, firstName: true, lastName: true, email: true, role: true, isActive: true },
      });

      return JSON.stringify({
        success: true,
        members: members.map(m => ({
          id: m.id,
          name: `${m.firstName} ${m.lastName}`,
          email: m.email,
          role: m.role,
          isActive: m.isActive,
        })),
        count: members.length,
      });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to list team members' });
    }
  }

  async getUserProfile(userId: string): Promise<string> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true, firstName: true, lastName: true, email: true, phone: true,
          role: true, timezone: true, isActive: true,
          organization: { select: { name: true } },
        },
      });

      if (!user) return JSON.stringify({ error: 'User not found' });

      return JSON.stringify({
        success: true,
        profile: {
          id: user.id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          phone: user.phone,
          role: user.role,
          timezone: user.timezone,
          organization: user.organization?.name,
        },
      });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to get profile' });
    }
  }

  async updateUserProfile(userId: string, args: FunctionArgs): Promise<string> {
    try {
      const updateData: Record<string, unknown> = {};
      if (args.firstName) updateData.firstName = args.firstName;
      if (args.lastName) updateData.lastName = args.lastName;
      if (args.phone) updateData.phone = args.phone;
      if (args.timezone) updateData.timezone = args.timezone;

      const user = await prisma.user.update({
        where: { id: userId },
        data: updateData,
      });

      return JSON.stringify({
        success: true,
        message: `✅ Updated profile for ${user.firstName} ${user.lastName}`,
      });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to update profile' });
    }
  }

  async getBusinessSettings(organizationId: string): Promise<string> {
    try {
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { id: true, name: true },
      });

      if (!org) return JSON.stringify({ error: 'Organization not found' });

      const settings = await prisma.businessSettings.findFirst({
        where: { organizationId },
        select: {
          companyName: true, industry: true, website: true, phone: true,
          address: true,
        },
      });

      return JSON.stringify({
        success: true,
        settings: {
          organizationName: org.name,
          ...settings,
        },
      });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to get business settings' });
    }
  }

  async updateBusinessSettings(organizationId: string, args: FunctionArgs): Promise<string> {
    try {
      // Update organization name if provided
      if (args.companyName) {
        await prisma.organization.update({
          where: { id: organizationId },
          data: { name: args.companyName },
        });
      }

      // Update business settings
      const settingsData: Record<string, unknown> = {};
      if (args.companyName) settingsData.companyName = args.companyName;
      if (args.industry) settingsData.industry = args.industry;
      if (args.website) settingsData.website = args.website;
      if (args.phone) settingsData.phone = args.phone;
      if (args.address) settingsData.address = args.address;

      const existing = await prisma.businessSettings.findFirst({ where: { organizationId } });
      if (existing) {
        await prisma.businessSettings.update({
          where: { id: existing.id },
          data: settingsData,
        });
      }

      return JSON.stringify({
        success: true,
        message: `✅ Updated business settings`,
      });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to update business settings' });
    }
  }

  // ============================================
  // APPOINTMENTS LIST
  // ============================================

  async listAppointments(organizationId: string, args: FunctionArgs): Promise<string> {
    try {
      const where: Prisma.AppointmentWhereInput = { organizationId };
      if (args.leadId) where.leadId = args.leadId;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (args.status) where.status = args.status as any;
      if (args.upcoming !== false) where.startTime = { gte: new Date() };

      const appointments = await prisma.appointment.findMany({
        where,
        take: args.limit || 20,
        orderBy: { startTime: 'asc' },
        select: {
          id: true, title: true, description: true, startTime: true, endTime: true,
          location: true, status: true,
          lead: { select: { firstName: true, lastName: true } },
        },
      });

      return JSON.stringify({
        success: true,
        appointments: appointments.map(a => ({
          id: a.id,
          title: a.title,
          description: a.description,
          startTime: a.startTime,
          endTime: a.endTime,
          location: a.location,
          status: a.status,
          leadName: a.lead ? `${a.lead.firstName} ${a.lead.lastName}` : null,
        })),
        count: appointments.length,
      });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to list appointments' });
    }
  }

  private extractSubjectLine(email: string): string {
    const subjectMatch = email.match(/Subject:?\s*(.+)/i);
    return subjectMatch ? subjectMatch[1].trim() : 'Follow Up';
  }

  private extractEmailBody(email: string): string {
    return email.replace(/Subject:?\s*.+\n*/i, '').trim();
  }

  /**
   * Sanitize function arguments from AI to prevent stored XSS and
   * enforce basic type/length constraints.
   */
  private sanitizeArgs(args: FunctionArgs): FunctionArgs {
    const sanitized: FunctionArgs = {}
    for (const [key, value] of Object.entries(args)) {
      if (typeof value === 'string') {
        // Strip HTML tags, limit length, and trim
        sanitized[key] = value.replace(/<[^>]*>/g, '').substring(0, 10000).trim()
      } else if (typeof value === 'number') {
        // Clamp numbers to reasonable range
        sanitized[key] = Math.max(-1_000_000, Math.min(1_000_000, value))
      } else if (Array.isArray(value)) {
        // Limit array size and sanitize string items
        sanitized[key] = value.slice(0, 100).map(item =>
          typeof item === 'string' ? item.replace(/<[^>]*>/g, '').substring(0, 5000) : item
        )
      } else {
        sanitized[key] = value
      }
    }
    return sanitized
  }

  async executeFunction(functionName: string, args: FunctionArgs, organizationId: string, userId: string, userRole?: string): Promise<string> {
    // Sanitize all arguments before execution
    const sanitizedArgs = this.sanitizeArgs(args)

    // ── Service-layer permission enforcement ──
    // Admin-only functions require ADMIN or MANAGER role even if called directly
    if (ADMIN_ONLY_FUNCTIONS.has(functionName)) {
      if (userRole !== 'ADMIN' && userRole !== 'MANAGER') {
        logger.warn(`[AI Functions] Blocked ${functionName} for user ${userId} with role ${userRole}`)
        return JSON.stringify({
          error: `Permission denied: "${functionName}" requires admin or manager privileges.`,
        })
      }
    }

    // ── Audit logging for destructive actions ──
    if (DESTRUCTIVE_FUNCTIONS.has(functionName)) {
      logger.info(`[AI Audit] DESTRUCTIVE action: ${functionName} | user: ${userId} | org: ${organizationId} | args: ${JSON.stringify(sanitizedArgs)}`)
      try {
        await prisma.activity.create({
          data: {
            type: 'NOTE_ADDED',
            title: `AI Chatbot: ${functionName}`,
            description: `Destructive action "${functionName}" executed via AI chatbot by user ${userId}. Args: ${JSON.stringify(sanitizedArgs).substring(0, 500)}`,
            organizationId,
            userId,
            leadId: sanitizedArgs.leadId || null,
          },
        })
      } catch (auditErr) {
        logger.error('[AI Audit] Failed to write audit log:', auditErr)
        // Don't block the action if audit logging fails
      }
    }

    switch (functionName) {
      // Lead CRUD
      case 'create_lead': return this.createLead(organizationId, userId, sanitizedArgs);
      case 'update_lead': return this.updateLead(organizationId, sanitizedArgs);
      case 'delete_lead': return this.deleteLead(organizationId, sanitizedArgs);
      case 'add_note_to_lead': return this.addNoteToLead(organizationId, userId, sanitizedArgs);
      case 'add_tag_to_lead': return this.addTagToLead(organizationId, sanitizedArgs);

      // Actions
      case 'create_activity': return this.createActivity(organizationId, userId, sanitizedArgs);
      case 'send_email': return this.sendEmail(organizationId, userId, sanitizedArgs);
      case 'send_sms': return this.sendSMS(organizationId, userId, sanitizedArgs);
      case 'schedule_appointment': return this.scheduleAppointment(organizationId, userId, sanitizedArgs);

      // Query functions
      case 'get_lead_count': return this.getLeadCount(organizationId, sanitizedArgs);
      case 'search_leads': return this.searchLeads(organizationId, sanitizedArgs);
      case 'get_recent_activities': return this.getRecentActivities(organizationId, sanitizedArgs);
      case 'get_lead_details': return this.getLeadDetails(organizationId, sanitizedArgs);

      // Task Management
      case 'create_task': return this.createTask(organizationId, userId, sanitizedArgs);
      case 'update_task': return this.updateTask(organizationId, sanitizedArgs);
      case 'delete_task': return this.deleteTask(organizationId, sanitizedArgs);
      case 'complete_task': return this.completeTask(organizationId, sanitizedArgs);

      // Appointment Management
      case 'update_appointment': return this.updateAppointment(organizationId, sanitizedArgs);
      case 'cancel_appointment': return this.cancelAppointment(organizationId, sanitizedArgs);
      case 'confirm_appointment': return this.confirmAppointment(organizationId, sanitizedArgs);
      case 'reschedule_appointment': return this.rescheduleAppointment(organizationId, sanitizedArgs);

      // Note Management
      case 'update_note': return this.updateNote(organizationId, sanitizedArgs);
      case 'delete_note': return this.deleteNote(organizationId, sanitizedArgs);

      // Tag Management
      case 'create_tag': return this.createTag(organizationId, sanitizedArgs);
      case 'update_tag': return this.updateTag(organizationId, sanitizedArgs);
      case 'delete_tag': return this.deleteTag(organizationId, sanitizedArgs);
      case 'remove_tag_from_lead': return this.removeTagFromLead(organizationId, sanitizedArgs);

      // Campaign Management
      case 'create_campaign': return this.createCampaign(organizationId, userId, sanitizedArgs);
      case 'update_campaign': return this.updateCampaign(organizationId, sanitizedArgs);
      case 'delete_campaign': return this.deleteCampaign(organizationId, sanitizedArgs);
      case 'pause_campaign': return this.pauseCampaign(organizationId, sanitizedArgs);
      case 'send_campaign': return this.sendCampaign(organizationId, sanitizedArgs);
      case 'duplicate_campaign': return this.duplicateCampaign(organizationId, sanitizedArgs);
      case 'archive_campaign': return this.archiveCampaign(organizationId, sanitizedArgs);
      case 'get_campaign_analytics': return this.getCampaignAnalytics(organizationId, sanitizedArgs);

      // Workflow Automation
      case 'create_workflow': return this.createWorkflow(organizationId, userId, sanitizedArgs);
      case 'update_workflow': return this.updateWorkflow(organizationId, sanitizedArgs);
      case 'delete_workflow': return this.deleteWorkflow(organizationId, sanitizedArgs);
      case 'toggle_workflow': return this.toggleWorkflow(organizationId, sanitizedArgs);
      case 'trigger_workflow': return this.triggerWorkflow(organizationId, sanitizedArgs);

      // Template Management
      case 'create_email_template': return this.createEmailTemplate(organizationId, userId, sanitizedArgs);
      case 'create_sms_template': return this.createSMSTemplate(organizationId, userId, sanitizedArgs);
      case 'delete_email_template': return this.deleteEmailTemplate(organizationId, sanitizedArgs);
      case 'delete_sms_template': return this.deleteSMSTemplate(organizationId, sanitizedArgs);

      // Bulk Operations
      case 'bulk_update_leads': return this.bulkUpdateLeads(organizationId, sanitizedArgs);
      case 'bulk_delete_leads': return this.bulkDeleteLeads(organizationId, sanitizedArgs);

      // Analytics & Reporting
      case 'get_dashboard_stats': return this.getDashboardStats(organizationId, sanitizedArgs);
      case 'get_lead_analytics': return this.getLeadAnalytics(organizationId, sanitizedArgs);
      case 'get_conversion_funnel': return this.getConversionFunnel(organizationId, sanitizedArgs);

      // Integration Management
      case 'connect_integration': return this.connectIntegration(organizationId, sanitizedArgs);
      case 'disconnect_integration': return this.disconnectIntegration(organizationId, sanitizedArgs);
      case 'sync_integration': return this.syncIntegration(organizationId, sanitizedArgs);

      // Lead Status & Intelligence
      case 'update_lead_status': return this.updateLeadStatus(organizationId, sanitizedArgs);
      case 'compose_email': return this.composeEmail(organizationId, userId, sanitizedArgs);
      case 'compose_sms': return this.composeSMS(organizationId, userId, sanitizedArgs);
      case 'compose_script': return this.composeScript(organizationId, userId, sanitizedArgs);
      case 'predict_conversion': return this.predictConversion(organizationId, sanitizedArgs);
      case 'get_next_action': return this.getNextAction(organizationId, sanitizedArgs);
      case 'analyze_engagement': return this.analyzeEngagement(organizationId, sanitizedArgs);
      case 'identify_at_risk_leads': return this.identifyAtRiskLeads(organizationId, sanitizedArgs);

      // Pipeline Management
      case 'get_pipelines': return this.getPipelines(organizationId);
      case 'create_pipeline': return this.createPipeline(organizationId, sanitizedArgs);
      case 'move_lead_to_stage': return this.moveLeadToStage(organizationId, sanitizedArgs);
      case 'get_pipeline_leads': return this.getPipelineLeads(organizationId, sanitizedArgs);

      // Goal Tracking
      case 'create_goal': return this.createGoal(organizationId, userId, sanitizedArgs);
      case 'list_goals': return this.listGoals(organizationId, userId, sanitizedArgs);
      case 'update_goal': return this.updateGoal(organizationId, sanitizedArgs);
      case 'delete_goal': return this.deleteGoal(organizationId, sanitizedArgs);

      // Call Logging
      case 'log_call': return this.logCall(organizationId, userId, sanitizedArgs);
      case 'get_call_stats': return this.getCallStats(organizationId, sanitizedArgs);
      case 'get_calls': return this.getCalls(organizationId, sanitizedArgs);

      // Notifications
      case 'get_notifications': return this.getNotifications(organizationId, userId, sanitizedArgs);
      case 'get_unread_notification_count': return this.getUnreadNotificationCount(organizationId, userId);
      case 'mark_notifications_read': return this.markNotificationsRead(organizationId, userId);

      // List/Search Functions
      case 'list_campaigns': return this.listCampaigns(organizationId, sanitizedArgs);
      case 'list_workflows': return this.listWorkflows(organizationId, sanitizedArgs);
      case 'list_tasks': return this.listTasks(organizationId, userId, sanitizedArgs);
      case 'list_email_templates': return this.listEmailTemplates(organizationId, sanitizedArgs);
      case 'list_sms_templates': return this.listSMSTemplates(organizationId, sanitizedArgs);

      // Custom Fields
      case 'get_custom_fields': return this.getCustomFields(organizationId);
      case 'create_custom_field': return this.createCustomField(organizationId, sanitizedArgs);
      case 'delete_custom_field': return this.deleteCustomField(organizationId, sanitizedArgs);

      // Export
      case 'export_data': return this.exportData(organizationId, sanitizedArgs);

      // Saved Filters & Reports
      case 'list_saved_filters': return this.listSavedFilters(organizationId, userId);
      case 'create_saved_filter': return this.createSavedFilter(organizationId, userId, sanitizedArgs);
      case 'delete_saved_filter': return this.deleteSavedFilter(organizationId, sanitizedArgs);
      case 'list_saved_reports': return this.listSavedReports(organizationId, userId);
      case 'create_saved_report': return this.createSavedReport(organizationId, userId, sanitizedArgs);
      case 'delete_saved_report': return this.deleteSavedReport(organizationId, sanitizedArgs);

      // Team & Settings
      case 'list_team_members': return this.listTeamMembers(organizationId);
      case 'get_user_profile': return this.getUserProfile(userId);
      case 'update_user_profile': return this.updateUserProfile(userId, sanitizedArgs);
      case 'get_business_settings': return this.getBusinessSettings(organizationId);
      case 'update_business_settings': return this.updateBusinessSettings(organizationId, sanitizedArgs);

      // Appointments List
      case 'list_appointments': return this.listAppointments(organizationId, sanitizedArgs);
      
      default: return JSON.stringify({ error: `Unknown function: ${functionName}` });
    }
  }
}

let aiFunctionsService: AIFunctionsService;
export const getAIFunctionsService = (): AIFunctionsService => {
  if (!aiFunctionsService) aiFunctionsService = new AIFunctionsService();
  return aiFunctionsService;
};
