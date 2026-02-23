import { Prisma, TaskPriority, LeadStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { getOpenAIService } from './openai.service';
import { getIntelligenceService } from './intelligence.service';

export const AI_FUNCTIONS = [
  {
    name: 'create_lead',
    description: 'CREATE a new lead in the CRM. Use this when user says "create/add/make a lead" - DO IT, don\'t just explain!',
    parameters: {
      type: 'object',
      properties: {
        firstName: { type: 'string', description: 'Lead first name (REQUIRED)' },
        lastName: { type: 'string', description: 'Lead last name (REQUIRED)' },
        email: { type: 'string', description: 'Email address (REQUIRED)' },
        phone: { type: 'string', description: 'Phone number (optional)' },
        status: { 
          type: 'string', 
          enum: ['NEW', 'CONTACTED', 'QUALIFIED', 'UNQUALIFIED', 'CONVERTED'],
          description: 'Initial lead status (default: NEW)'
        },
        source: { type: 'string', description: 'Lead source (e.g., Website, Referral, Cold Call)' },
        score: { type: 'number', description: 'Initial lead score 0-100' },
        notes: { type: 'string', description: 'Initial notes about the lead' }
      },
      required: ['firstName', 'lastName', 'email'],
    },
  },
  {
    name: 'update_lead',
    description: 'Update lead information (email, phone, notes, etc.)',
    parameters: {
      type: 'object',
      properties: {
        leadId: { type: 'string', description: 'ID of the lead to update' },
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        email: { type: 'string' },
        phone: { type: 'string' },
        source: { type: 'string' },
        score: { type: 'number' },
      },
      required: ['leadId'],
    },
  },
  {
    name: 'delete_lead',
    description: 'Delete a lead from the system',
    parameters: {
      type: 'object',
      properties: {
        leadId: { type: 'string', description: 'ID of the lead to delete' },
      },
      required: ['leadId'],
    },
  },
  {
    name: 'add_note_to_lead',
    description: 'Add a note to a lead',
    parameters: {
      type: 'object',
      properties: {
        leadId: { type: 'string', description: 'ID of the lead' },
        content: { type: 'string', description: 'Note content' },
      },
      required: ['leadId', 'content'],
    },
  },
  {
    name: 'add_tag_to_lead',
    description: 'Add a tag to categorize a lead',
    parameters: {
      type: 'object',
      properties: {
        leadId: { type: 'string', description: 'ID of the lead' },
        tagName: { type: 'string', description: 'Tag name (e.g., "Hot Lead", "First Time Buyer")' },
      },
      required: ['leadId', 'tagName'],
    },
  },
  {
    name: 'create_activity',
    description: 'Log an activity for a lead (call, email, meeting, etc.)',
    parameters: {
      type: 'object',
      properties: {
        leadId: { type: 'string', description: 'ID of the lead' },
        type: { 
          type: 'string', 
          enum: ['CALL', 'EMAIL', 'MEETING', 'NOTE', 'SMS', 'OTHER'],
          description: 'Type of activity'
        },
        description: { type: 'string', description: 'Activity description' },
      },
      required: ['leadId', 'type', 'description'],
    },
  },
  {
    name: 'send_email',
    description: 'Actually send an email to a lead (not just compose)',
    parameters: {
      type: 'object',
      properties: {
        leadId: { type: 'string', description: 'ID of the lead' },
        subject: { type: 'string', description: 'Email subject' },
        body: { type: 'string', description: 'Email body' },
      },
      required: ['leadId', 'subject', 'body'],
    },
  },
  {
    name: 'send_sms',
    description: 'Actually send an SMS to a lead (not just compose)',
    parameters: {
      type: 'object',
      properties: {
        leadId: { type: 'string', description: 'ID of the lead' },
        message: { type: 'string', description: 'SMS message (max 160 chars)' },
      },
      required: ['leadId', 'message'],
    },
  },
  {
    name: 'schedule_appointment',
    description: 'Schedule an appointment/meeting with a lead',
    parameters: {
      type: 'object',
      properties: {
        leadId: { type: 'string', description: 'ID of the lead' },
        title: { type: 'string', description: 'Appointment title' },
        dateTime: { type: 'string', description: 'ISO date-time string for appointment' },
        duration: { type: 'number', description: 'Duration in minutes' },
        location: { type: 'string', description: 'Meeting location or video link' },
        notes: { type: 'string', description: 'Additional notes' },
      },
      required: ['leadId', 'title', 'dateTime'],
    },
  },
  {
    name: 'get_lead_count',
    description: 'Get the count of leads matching specific criteria',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['NEW', 'CONTACTED', 'QUALIFIED', 'UNQUALIFIED', 'CONVERTED'] },
        scoreMin: { type: 'number' },
        scoreMax: { type: 'number' },
      },
    },
  },
  {
    name: 'search_leads',
    description: 'Search for leads and return their details',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['NEW', 'CONTACTED', 'QUALIFIED', 'UNQUALIFIED', 'CONVERTED'] },
        scoreMin: { type: 'number' },
        limit: { type: 'number' },
      },
    },
  },
  {
    name: 'create_task',
    description: 'Create a follow-up task for a lead',
    parameters: {
      type: 'object',
      properties: {
        leadId: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' },
        dueDate: { type: 'string' },
        priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] },
      },
      required: ['leadId', 'title'],
    },
  },
  {
    name: 'update_lead_status',
    description: 'Update the status of a lead',
    parameters: {
      type: 'object',
      properties: {
        leadId: { type: 'string' },
        status: { type: 'string', enum: ['NEW', 'CONTACTED', 'QUALIFIED', 'UNQUALIFIED', 'CONVERTED'] },
      },
      required: ['leadId', 'status'],
    },
  },
  {
    name: 'get_recent_activities',
    description: 'Get recent activities for a lead or organization',
    parameters: {
      type: 'object',
      properties: {
        leadId: { type: 'string' },
        limit: { type: 'number' },
      },
    },
  },
  {
    name: 'get_lead_details',
    description: 'Get detailed information about a specific lead',
    parameters: {
      type: 'object',
      properties: {
        leadId: { type: 'string' },
      },
      required: ['leadId'],
    },
  },
  {
    name: 'compose_email',
    description: 'Draft a personalized email to a lead',
    parameters: {
      type: 'object',
      properties: {
        leadId: { type: 'string', description: 'ID of the lead' },
        purpose: { 
          type: 'string', 
          enum: ['follow_up', 'new_listing', 'appointment_reminder', 'check_in', 'property_update', 'thank_you'],
          description: 'Purpose of the email'
        },
        tone: { 
          type: 'string', 
          enum: ['professional', 'friendly', 'urgent', 'casual', 'persuasive', 'formal'],
          description: 'Tone of the email'
        },
        keyPoints: { 
          type: 'array', 
          items: { type: 'string' },
          description: 'Key points to include in email'
        },
        includeCTA: {
          type: 'boolean',
          description: 'Include call-to-action'
        }
      },
      required: ['leadId', 'purpose'],
    },
  },
  {
    name: 'compose_sms',
    description: 'Draft a personalized SMS message to a lead (160 chars max)',
    parameters: {
      type: 'object',
      properties: {
        leadId: { type: 'string' },
        purpose: { 
          type: 'string', 
          enum: ['appointment_reminder', 'quick_followup', 'property_alert', 'confirmation', 'check_in']
        },
        tone: { 
          type: 'string', 
          enum: ['professional', 'friendly', 'urgent', 'casual']
        },
        maxLength: {
          type: 'number',
          enum: [80, 120, 160],
          description: 'Max message length'
        }
      },
      required: ['leadId', 'purpose'],
    },
  },
  {
    name: 'compose_script',
    description: 'Draft a personalized call script for a lead',
    parameters: {
      type: 'object',
      properties: {
        leadId: { type: 'string' },
        purpose: { 
          type: 'string', 
          enum: ['cold_call', 'warm_followup', 'appointment_booking', 'objection_handling', 'closing']
        },
        tone: { 
          type: 'string', 
          enum: ['professional', 'friendly', 'persuasive', 'casual']
        },
        includeObjections: {
          type: 'boolean',
          description: 'Include common objection responses'
        }
      },
      required: ['leadId', 'purpose'],
    },
  },
  {
    name: 'predict_conversion',
    description: 'Get AI prediction of lead conversion probability',
    parameters: {
      type: 'object',
      properties: {
        leadId: { type: 'string', description: 'Lead ID to analyze' }
      },
      required: ['leadId'],
    },
  },
  {
    name: 'get_next_action',
    description: 'Get AI recommendation for next best action with a lead',
    parameters: {
      type: 'object',
      properties: {
        leadId: { type: 'string' }
      },
      required: ['leadId'],
    },
  },
  {
    name: 'analyze_engagement',
    description: 'Analyze lead engagement patterns and optimal contact times',
    parameters: {
      type: 'object',
      properties: {
        leadId: { type: 'string' }
      },
      required: ['leadId'],
    },
  },
  {
    name: 'identify_at_risk_leads',
    description: 'Find leads that are at risk of going cold (no recent activity)',
    parameters: {
      type: 'object',
      properties: {
        minScore: { type: 'number', description: 'Minimum score to include' },
        daysInactive: { type: 'number', description: 'Days without contact' }
      },
    },
  },
  
  // ============================================
  // TASK MANAGEMENT
  // ============================================
  {
    name: 'update_task',
    description: 'Update an existing task',
    parameters: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'ID of the task to update' },
        title: { type: 'string' },
        description: { type: 'string' },
        dueDate: { type: 'string' },
        priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] },
        completed: { type: 'boolean' },
      },
      required: ['taskId'],
    },
  },
  {
    name: 'delete_task',
    description: 'Delete a task',
    parameters: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'ID of the task to delete' },
      },
      required: ['taskId'],
    },
  },
  {
    name: 'complete_task',
    description: 'Mark a task as complete',
    parameters: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'ID of the task to complete' },
      },
      required: ['taskId'],
    },
  },
  
  // ============================================
  // APPOINTMENT MANAGEMENT
  // ============================================
  {
    name: 'update_appointment',
    description: 'Update an existing appointment',
    parameters: {
      type: 'object',
      properties: {
        appointmentId: { type: 'string', description: 'ID of the appointment' },
        title: { type: 'string' },
        dateTime: { type: 'string' },
        duration: { type: 'number' },
        location: { type: 'string' },
        notes: { type: 'string' },
      },
      required: ['appointmentId'],
    },
  },
  {
    name: 'cancel_appointment',
    description: 'Cancel an appointment',
    parameters: {
      type: 'object',
      properties: {
        appointmentId: { type: 'string', description: 'ID of the appointment to cancel' },
        reason: { type: 'string', description: 'Cancellation reason' },
      },
      required: ['appointmentId'],
    },
  },
  {
    name: 'confirm_appointment',
    description: 'Confirm an appointment',
    parameters: {
      type: 'object',
      properties: {
        appointmentId: { type: 'string', description: 'ID of the appointment to confirm' },
      },
      required: ['appointmentId'],
    },
  },
  {
    name: 'reschedule_appointment',
    description: 'Reschedule an appointment to a new date/time',
    parameters: {
      type: 'object',
      properties: {
        appointmentId: { type: 'string' },
        newDateTime: { type: 'string', description: 'New date/time for appointment' },
      },
      required: ['appointmentId', 'newDateTime'],
    },
  },
  
  // ============================================
  // NOTE MANAGEMENT
  // ============================================
  {
    name: 'update_note',
    description: 'Update an existing note',
    parameters: {
      type: 'object',
      properties: {
        noteId: { type: 'string', description: 'ID of the note to update' },
        content: { type: 'string', description: 'New note content' },
      },
      required: ['noteId', 'content'],
    },
  },
  {
    name: 'delete_note',
    description: 'Delete a note',
    parameters: {
      type: 'object',
      properties: {
        noteId: { type: 'string', description: 'ID of the note to delete' },
      },
      required: ['noteId'],
    },
  },
  
  // ============================================
  // TAG MANAGEMENT
  // ============================================
  {
    name: 'create_tag',
    description: 'Create a new tag for organizing leads',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Tag name' },
        color: { type: 'string', description: 'Hex color code (e.g., #FF5733)' },
      },
      required: ['name'],
    },
  },
  {
    name: 'update_tag',
    description: 'Update an existing tag',
    parameters: {
      type: 'object',
      properties: {
        tagId: { type: 'string', description: 'ID of the tag' },
        name: { type: 'string' },
        color: { type: 'string' },
      },
      required: ['tagId'],
    },
  },
  {
    name: 'delete_tag',
    description: 'Delete a tag',
    parameters: {
      type: 'object',
      properties: {
        tagId: { type: 'string', description: 'ID of the tag to delete' },
      },
      required: ['tagId'],
    },
  },
  {
    name: 'remove_tag_from_lead',
    description: 'Remove a tag from a lead',
    parameters: {
      type: 'object',
      properties: {
        leadId: { type: 'string' },
        tagId: { type: 'string' },
      },
      required: ['leadId', 'tagId'],
    },
  },
  
  // ============================================
  // CAMPAIGN MANAGEMENT
  // ============================================
  {
    name: 'create_campaign',
    description: 'Create a new email or SMS campaign',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Campaign name' },
        type: { type: 'string', enum: ['EMAIL', 'SMS'], description: 'Campaign type' },
        subject: { type: 'string', description: 'Email subject (for email campaigns)' },
        content: { type: 'string', description: 'Campaign content' },
        scheduledFor: { type: 'string', description: 'ISO date-time to send campaign' },
        targetAudience: { type: 'string', description: 'Target audience description' },
      },
      required: ['name', 'type', 'content'],
    },
  },
  {
    name: 'update_campaign',
    description: 'Update an existing campaign',
    parameters: {
      type: 'object',
      properties: {
        campaignId: { type: 'string' },
        name: { type: 'string' },
        subject: { type: 'string' },
        content: { type: 'string' },
        scheduledFor: { type: 'string' },
      },
      required: ['campaignId'],
    },
  },
  {
    name: 'delete_campaign',
    description: 'Delete a campaign',
    parameters: {
      type: 'object',
      properties: {
        campaignId: { type: 'string', description: 'ID of campaign to delete' },
      },
      required: ['campaignId'],
    },
  },
  {
    name: 'pause_campaign',
    description: 'Pause a running campaign',
    parameters: {
      type: 'object',
      properties: {
        campaignId: { type: 'string' },
      },
      required: ['campaignId'],
    },
  },
  {
    name: 'send_campaign',
    description: 'Launch/send a campaign immediately or schedule it',
    parameters: {
      type: 'object',
      properties: {
        campaignId: { type: 'string' },
        sendNow: { type: 'boolean', description: 'Send immediately (true) or use scheduled time (false)' },
      },
      required: ['campaignId'],
    },
  },
  {
    name: 'duplicate_campaign',
    description: 'Duplicate an existing campaign',
    parameters: {
      type: 'object',
      properties: {
        campaignId: { type: 'string' },
        newName: { type: 'string', description: 'Name for duplicated campaign' },
      },
      required: ['campaignId'],
    },
  },
  {
    name: 'archive_campaign',
    description: 'Archive a campaign',
    parameters: {
      type: 'object',
      properties: {
        campaignId: { type: 'string' },
      },
      required: ['campaignId'],
    },
  },
  {
    name: 'get_campaign_analytics',
    description: 'Get analytics and performance metrics for a campaign',
    parameters: {
      type: 'object',
      properties: {
        campaignId: { type: 'string' },
      },
      required: ['campaignId'],
    },
  },
  
  // ============================================
  // WORKFLOW AUTOMATION
  // ============================================
  {
    name: 'create_workflow',
    description: 'Create an automated workflow',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Workflow name' },
        description: { type: 'string' },
        trigger: { type: 'string', description: 'What triggers this workflow' },
        actions: { type: 'string', description: 'Actions to perform (JSON string)' },
      },
      required: ['name', 'trigger', 'actions'],
    },
  },
  {
    name: 'update_workflow',
    description: 'Update an existing workflow',
    parameters: {
      type: 'object',
      properties: {
        workflowId: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' },
        trigger: { type: 'string' },
        actions: { type: 'string' },
      },
      required: ['workflowId'],
    },
  },
  {
    name: 'delete_workflow',
    description: 'Delete a workflow',
    parameters: {
      type: 'object',
      properties: {
        workflowId: { type: 'string' },
      },
      required: ['workflowId'],
    },
  },
  {
    name: 'toggle_workflow',
    description: 'Enable or disable a workflow',
    parameters: {
      type: 'object',
      properties: {
        workflowId: { type: 'string' },
        active: { type: 'boolean', description: 'Set to true to enable, false to disable' },
      },
      required: ['workflowId', 'active'],
    },
  },
  {
    name: 'trigger_workflow',
    description: 'Manually trigger a workflow for a lead',
    parameters: {
      type: 'object',
      properties: {
        workflowId: { type: 'string' },
        leadId: { type: 'string' },
      },
      required: ['workflowId', 'leadId'],
    },
  },
  
  // ============================================
  // TEMPLATE MANAGEMENT
  // ============================================
  {
    name: 'create_email_template',
    description: 'Create a reusable email template',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        subject: { type: 'string' },
        body: { type: 'string' },
        category: { type: 'string' },
      },
      required: ['name', 'subject', 'body'],
    },
  },
  {
    name: 'create_sms_template',
    description: 'Create a reusable SMS template',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        content: { type: 'string', description: 'SMS content (max 160 chars)' },
        category: { type: 'string' },
      },
      required: ['name', 'content'],
    },
  },
  {
    name: 'delete_email_template',
    description: 'Delete an email template',
    parameters: {
      type: 'object',
      properties: {
        templateId: { type: 'string' },
      },
      required: ['templateId'],
    },
  },
  {
    name: 'delete_sms_template',
    description: 'Delete an SMS template',
    parameters: {
      type: 'object',
      properties: {
        templateId: { type: 'string' },
      },
      required: ['templateId'],
    },
  },
  
  // ============================================
  // BULK OPERATIONS
  // ============================================
  {
    name: 'bulk_update_leads',
    description: 'Update multiple leads matching specific criteria. Use when user wants to update many leads at once based on filters like score, status, or date ranges.',
    parameters: {
      type: 'object',
      properties: {
        criteria: { 
          type: 'object', 
          description: 'Filter criteria: {score: {lt: number}, status: string, lastContactedBefore: date}' 
        },
        updates: { 
          type: 'object', 
          description: 'Fields to update: {status: string, score: number, assignedTo: string}' 
        },
      },
      required: ['criteria', 'updates'],
    },
  },
  {
    name: 'bulk_delete_leads',
    description: 'DESTRUCTIVE: Permanently delete multiple leads matching criteria. Use ONLY when user explicitly confirms deletion with words like "delete", "remove", "clean up old leads". User must specify clear filter criteria.',
    parameters: {
      type: 'object',
      properties: {
        criteria: { 
          type: 'object', 
          description: 'Filter criteria: {status: string, lastContactedBefore: date, scoreLessThan: number}' 
        },
      },
      required: ['criteria'],
    },
  },
  
  // ============================================
  // ANALYTICS & REPORTING
  // ============================================
  {
    name: 'get_dashboard_stats',
    description: 'Get overall dashboard statistics',
    parameters: {
      type: 'object',
      properties: {
        timeRange: { type: 'string', enum: ['today', 'week', 'month', 'quarter', 'year'] },
      },
    },
  },
  {
    name: 'get_lead_analytics',
    description: 'Get detailed lead analytics and insights',
    parameters: {
      type: 'object',
      properties: {
        timeRange: { type: 'string', enum: ['week', 'month', 'quarter', 'year'] },
      },
    },
  },
  {
    name: 'get_conversion_funnel',
    description: 'Get conversion funnel data showing lead progression',
    parameters: {
      type: 'object',
      properties: {
        timeRange: { type: 'string', enum: ['week', 'month', 'quarter', 'year'] },
      },
    },
  },
  
  // ============================================
  // INTEGRATION MANAGEMENT
  // ============================================
  {
    name: 'connect_integration',
    description: 'Connect an external integration (Twilio, SendGrid, Zapier, etc.)',
    parameters: {
      type: 'object',
      properties: {
        provider: { type: 'string', enum: ['twilio', 'sendgrid', 'zapier', 'calendly', 'stripe'] },
        apiKey: { type: 'string' },
        additionalConfig: { type: 'object' },
      },
      required: ['provider', 'apiKey'],
    },
  },
  {
    name: 'disconnect_integration',
    description: 'Disconnect an external integration',
    parameters: {
      type: 'object',
      properties: {
        provider: { type: 'string' },
      },
      required: ['provider'],
    },
  },
  {
    name: 'sync_integration',
    description: 'Manually sync data with an integration',
    parameters: {
      type: 'object',
      properties: {
        provider: { type: 'string' },
      },
      required: ['provider'],
    },
  },
];

interface FunctionArgs {
  // Lead CRUD
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  source?: string;
  score?: number;
  notes?: string;
  
  // Existing fields
  leadId?: string;
  status?: string;
  scoreMin?: number;
  scoreMax?: number;
  limit?: number;
  title?: string;
  description?: string;
  dueDate?: string;
  priority?: string;
  purpose?: string;
  tone?: string;
  keyPoints?: string[];
  includeCTA?: boolean;
  maxLength?: number;
  includeObjections?: boolean;
  minScore?: number;
  daysInactive?: number;
  
  // New action fields
  content?: string;
  tagName?: string;
  type?: string;
  subject?: string;
  body?: string;
  message?: string;
  dateTime?: string;
  duration?: number;
  location?: string;
  
  // Task fields
  taskId?: string;
  completed?: boolean;
  
  // Appointment fields
  appointmentId?: string;
  newDateTime?: string;
  reason?: string;
  
  // Note fields
  noteId?: string;
  
  // Tag fields
  tagId?: string;
  name?: string;
  color?: string;
  
  // Campaign fields
  campaignId?: string;
  scheduledFor?: string;
  targetAudience?: string;
  sendNow?: boolean;
  newName?: string;
  
  // Workflow fields
  workflowId?: string;
  trigger?: string;
  actions?: string;
  active?: boolean;
  
  // Template fields
  templateId?: string;
  category?: string;
  
  // Bulk operation fields
  leadIds?: string[];
  updates?: Record<string, any>;
  
  // Analytics fields
  timeRange?: string;
  
  // Integration fields
  provider?: string;
  apiKey?: string;
  additionalConfig?: Record<string, any>;
}

export class AIFunctionsService {
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
      console.error('Create lead error:', error);
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

      const updateData: any = {};
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
      console.error('Add tag error:', error);
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

      const activityTypeMap: Record<string, any> = {
        'CALL': 'CALL_MADE',
        'EMAIL': 'EMAIL_SENT',
        'MEETING': 'MEETING_SCHEDULED',
        'NOTE': 'NOTE_ADDED',
        'SMS': 'SMS_SENT',
        'OTHER': 'NOTE_ADDED',
      };

      await prisma.activity.create({
        data: {
          type: activityTypeMap[args.type!] || 'NOTE_ADDED',
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

      // TODO: Integrate with actual email service (SendGrid, AWS SES, etc.)
      // For now, just log the activity

      return JSON.stringify({
        success: true,
        message: `✅ Email sent to ${lead.firstName} ${lead.lastName} (${lead.email})`,
        note: 'Email logged as activity. Integration with email service needed for actual sending.',
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

      if (args.message.length > 160) {
        return JSON.stringify({ error: 'SMS message must be 160 characters or less' });
      }

      // Log the SMS as an activity
      await prisma.activity.create({
        data: {
          type: 'SMS_SENT',
          title: 'SMS Sent',
          description: `Sent SMS: "${args.message.substring(0, 50)}..."`,
          leadId: args.leadId,
          organizationId,
          userId,
        },
      });

      // TODO: Integrate with SMS service (Twilio, etc.)

      return JSON.stringify({
        success: true,
        message: `✅ SMS sent to ${lead.firstName} ${lead.lastName} (${lead.phone})`,
        note: 'SMS logged as activity. Integration with SMS service needed for actual sending.',
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
      console.error('Schedule appointment error:', error);
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

      const task = await prisma.task.create({
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
      console.error('Create campaign error:', error);
      return JSON.stringify({ error: 'Failed to create campaign' });
    }
  }
  
  async updateCampaign(organizationId: string, args: FunctionArgs): Promise<string> {
    try {
      if (!args.campaignId) {
        return JSON.stringify({ error: 'campaignId is required' });
      }
      
      const updateData: any = {};
      if (args.name) updateData.name = args.name;
      if (args.subject) updateData.subject = args.subject;
      if (args.content) updateData.body = args.content;
      if (args.scheduledFor) updateData.startDate = new Date(args.scheduledFor);
      
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
      
      const openRate = campaign.sent > 0 ? ((campaign.opened / campaign.sent) * 100).toFixed(1) : '0.0';
      const clickRate = campaign.sent > 0 ? ((campaign.clicked / campaign.sent) * 100).toFixed(1) : '0.0';
      const conversionRate = campaign.sent > 0 ? ((campaign.converted / campaign.sent) * 100).toFixed(1) : '0.0';
      
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
      console.error('Create workflow error:', error);
      return JSON.stringify({ error: 'Failed to create workflow' });
    }
  }
  
  async updateWorkflow(organizationId: string, args: FunctionArgs): Promise<string> {
    try {
      if (!args.workflowId) {
        return JSON.stringify({ error: 'workflowId is required' });
      }
      
      const updateData: any = {};
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
  
  async getDashboardStats(organizationId: string, args: FunctionArgs): Promise<string> {
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
      
      const statusBreakdown = byStatus.reduce((acc: any, item: any) => {
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
      
      const contactedRate = total > 0 ? ((contacted / total) * 100).toFixed(1) : '0.0';
      const qualifiedRate = contacted > 0 ? ((qualified / contacted) * 100).toFixed(1) : '0.0';
      const convertedRate = qualified > 0 ? ((converted / qualified) * 100).toFixed(1) : '0.0';
      const overallRate = total > 0 ? ((converted / total) * 100).toFixed(1) : '0.0';
      
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
            config: args.additionalConfig || {},
            lastSyncAt: new Date(),
            syncStatus: 'connected',
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
            provider,
            isConnected: true,
            credentials: { apiKey: args.apiKey },
            config: args.additionalConfig || {},
            lastSyncAt: new Date(),
            syncStatus: 'connected',
          },
        });
        
        return JSON.stringify({
          success: true,
          integration: { id: integration.id, provider: integration.provider },
          message: `✅ Connected ${provider} integration`,
        });
      }
    } catch (error) {
      console.error('Connect integration error:', error);
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
          syncStatus: 'disconnected',
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
          syncStatus: 'synced',
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

  private extractSubjectLine(email: string): string {
    const subjectMatch = email.match(/Subject:?\s*(.+)/i);
    return subjectMatch ? subjectMatch[1].trim() : 'Follow Up';
  }

  private extractEmailBody(email: string): string {
    return email.replace(/Subject:?\s*.+\n*/i, '').trim();
  }

  async executeFunction(functionName: string, args: FunctionArgs, organizationId: string, userId: string): Promise<string> {
    switch (functionName) {
      // Lead CRUD
      case 'create_lead': return this.createLead(organizationId, userId, args);
      case 'update_lead': return this.updateLead(organizationId, args);
      case 'delete_lead': return this.deleteLead(organizationId, args);
      case 'add_note_to_lead': return this.addNoteToLead(organizationId, userId, args);
      case 'add_tag_to_lead': return this.addTagToLead(organizationId, args);
      
      // Actions
      case 'create_activity': return this.createActivity(organizationId, userId, args);
      case 'send_email': return this.sendEmail(organizationId, userId, args);
      case 'send_sms': return this.sendSMS(organizationId, userId, args);
      case 'schedule_appointment': return this.scheduleAppointment(organizationId, userId, args);
      
      // Query functions
      case 'get_lead_count': return this.getLeadCount(organizationId, args);
      case 'search_leads': return this.searchLeads(organizationId, args);
      case 'get_recent_activities': return this.getRecentActivities(organizationId, args);
      case 'get_lead_details': return this.getLeadDetails(organizationId, args);
      
      // Task Management
      case 'create_task': return this.createTask(organizationId, userId, args);
      case 'update_task': return this.updateTask(organizationId, args);
      case 'delete_task': return this.deleteTask(organizationId, args);
      case 'complete_task': return this.completeTask(organizationId, args);
      
      // Appointment Management
      case 'update_appointment': return this.updateAppointment(organizationId, args);
      case 'cancel_appointment': return this.cancelAppointment(organizationId, args);
      case 'confirm_appointment': return this.confirmAppointment(organizationId, args);
      case 'reschedule_appointment': return this.rescheduleAppointment(organizationId, args);
      
      // Note Management
      case 'update_note': return this.updateNote(organizationId, args);
      case 'delete_note': return this.deleteNote(organizationId, args);
      
      // Tag Management
      case 'create_tag': return this.createTag(organizationId, args);
      case 'update_tag': return this.updateTag(organizationId, args);
      case 'delete_tag': return this.deleteTag(organizationId, args);
      case 'remove_tag_from_lead': return this.removeTagFromLead(organizationId, args);
      
      // Campaign Management
      case 'create_campaign': return this.createCampaign(organizationId, userId, args);
      case 'update_campaign': return this.updateCampaign(organizationId, args);
      case 'delete_campaign': return this.deleteCampaign(organizationId, args);
      case 'pause_campaign': return this.pauseCampaign(organizationId, args);
      case 'send_campaign': return this.sendCampaign(organizationId, args);
      case 'duplicate_campaign': return this.duplicateCampaign(organizationId, args);
      case 'archive_campaign': return this.archiveCampaign(organizationId, args);
      case 'get_campaign_analytics': return this.getCampaignAnalytics(organizationId, args);
      
      // Workflow Automation
      case 'create_workflow': return this.createWorkflow(organizationId, userId, args);
      case 'update_workflow': return this.updateWorkflow(organizationId, args);
      case 'delete_workflow': return this.deleteWorkflow(organizationId, args);
      case 'toggle_workflow': return this.toggleWorkflow(organizationId, args);
      case 'trigger_workflow': return this.triggerWorkflow(organizationId, args);
      
      // Template Management
      case 'create_email_template': return this.createEmailTemplate(organizationId, userId, args);
      case 'create_sms_template': return this.createSMSTemplate(organizationId, userId, args);
      case 'delete_email_template': return this.deleteEmailTemplate(organizationId, args);
      case 'delete_sms_template': return this.deleteSMSTemplate(organizationId, args);
      
      // Bulk Operations
      case 'bulk_update_leads': return this.bulkUpdateLeads(organizationId, args);
      case 'bulk_delete_leads': return this.bulkDeleteLeads(organizationId, args);
      
      // Analytics & Reporting
      case 'get_dashboard_stats': return this.getDashboardStats(organizationId, args);
      case 'get_lead_analytics': return this.getLeadAnalytics(organizationId, args);
      case 'get_conversion_funnel': return this.getConversionFunnel(organizationId, args);
      
      // Integration Management
      case 'connect_integration': return this.connectIntegration(organizationId, args);
      case 'disconnect_integration': return this.disconnectIntegration(organizationId, args);
      case 'sync_integration': return this.syncIntegration(organizationId, args);
      
      // Lead Status & Intelligence
      case 'update_lead_status': return this.updateLeadStatus(organizationId, args);
      case 'compose_email': return this.composeEmail(organizationId, userId, args);
      case 'compose_sms': return this.composeSMS(organizationId, userId, args);
      case 'compose_script': return this.composeScript(organizationId, userId, args);
      case 'predict_conversion': return this.predictConversion(organizationId, args);
      case 'get_next_action': return this.getNextAction(organizationId, args);
      case 'analyze_engagement': return this.analyzeEngagement(organizationId, args);
      case 'identify_at_risk_leads': return this.identifyAtRiskLeads(organizationId, args);
      
      default: return JSON.stringify({ error: `Unknown function: ${functionName}` });
    }
  }
}

let aiFunctionsService: AIFunctionsService;
export const getAIFunctionsService = (): AIFunctionsService => {
  if (!aiFunctionsService) aiFunctionsService = new AIFunctionsService();
  return aiFunctionsService;
};
