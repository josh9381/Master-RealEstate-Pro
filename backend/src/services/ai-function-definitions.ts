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

  // ============================================
  // PIPELINE MANAGEMENT
  // ============================================
  {
    name: 'get_pipelines',
    description: 'List all sales pipelines with their stages',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'create_pipeline',
    description: 'Create a new sales pipeline with stages',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Pipeline name' },
        description: { type: 'string', description: 'Pipeline description' },
        stages: {
          type: 'array',
          items: { type: 'string' },
          description: 'Stage names in order (e.g., ["New", "Contacted", "Qualified", "Won"])',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'move_lead_to_stage',
    description: 'Move a lead to a different pipeline stage',
    parameters: {
      type: 'object',
      properties: {
        leadId: { type: 'string', description: 'ID of the lead to move' },
        pipelineId: { type: 'string', description: 'Pipeline ID (optional, uses default if omitted)' },
        stageId: { type: 'string', description: 'Target stage ID' },
        stageName: { type: 'string', description: 'Target stage name (alternative to stageId)' },
      },
      required: ['leadId'],
    },
  },
  {
    name: 'get_pipeline_leads',
    description: 'Get all leads in a specific pipeline, grouped by stage',
    parameters: {
      type: 'object',
      properties: {
        pipelineId: { type: 'string', description: 'Pipeline ID (uses default if omitted)' },
      },
    },
  },

  // ============================================
  // GOAL TRACKING
  // ============================================
  {
    name: 'create_goal',
    description: 'Create a performance goal (e.g., close 10 deals this month)',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Goal name' },
        metricType: {
          type: 'string',
          enum: ['LEADS_GENERATED', 'DEALS_CLOSED', 'REVENUE', 'CALLS_MADE', 'EMAILS_SENT', 'APPOINTMENTS_SET', 'CONVERSION_RATE'],
          description: 'What metric to track',
        },
        targetValue: { type: 'number', description: 'Target value to achieve' },
        period: {
          type: 'string',
          enum: ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'],
          description: 'Goal period (default: MONTHLY)',
        },
        startDate: { type: 'string', description: 'Start date (ISO format, defaults to today)' },
        endDate: { type: 'string', description: 'End date (ISO format, defaults to end of period)' },
        notes: { type: 'string', description: 'Notes about the goal' },
      },
      required: ['name', 'metricType', 'targetValue'],
    },
  },
  {
    name: 'list_goals',
    description: 'List all active goals with progress',
    parameters: {
      type: 'object',
      properties: {
        activeOnly: { type: 'boolean', description: 'Only show active goals (default: true)' },
      },
    },
  },
  {
    name: 'update_goal',
    description: 'Update a goal (target, name, progress, or mark complete)',
    parameters: {
      type: 'object',
      properties: {
        goalId: { type: 'string', description: 'ID of the goal' },
        name: { type: 'string' },
        targetValue: { type: 'number' },
        currentValue: { type: 'number', description: 'Manually set current progress' },
        isActive: { type: 'boolean' },
        notes: { type: 'string' },
      },
      required: ['goalId'],
    },
  },
  {
    name: 'delete_goal',
    description: 'Delete a goal',
    parameters: {
      type: 'object',
      properties: {
        goalId: { type: 'string', description: 'ID of the goal to delete' },
      },
      required: ['goalId'],
    },
  },

  // ============================================
  // CALL LOGGING
  // ============================================
  {
    name: 'log_call',
    description: 'Log a phone call with a lead',
    parameters: {
      type: 'object',
      properties: {
        leadId: { type: 'string', description: 'ID of the lead called' },
        direction: { type: 'string', enum: ['INBOUND', 'OUTBOUND'], description: 'Call direction' },
        phoneNumber: { type: 'string', description: 'Phone number' },
        outcome: {
          type: 'string',
          enum: ['ANSWERED', 'VOICEMAIL', 'NO_ANSWER', 'BUSY', 'WRONG_NUMBER', 'CALLBACK_REQUESTED', 'INTERESTED', 'NOT_INTERESTED'],
          description: 'Call outcome',
        },
        duration: { type: 'number', description: 'Call duration in seconds' },
        notes: { type: 'string', description: 'Call notes' },
        followUpDate: { type: 'string', description: 'Follow-up date if needed (ISO format)' },
      },
      required: ['leadId', 'direction', 'phoneNumber'],
    },
  },
  {
    name: 'get_call_stats',
    description: 'Get call statistics (total calls, answered, avg duration, etc.)',
    parameters: {
      type: 'object',
      properties: {
        timeRange: { type: 'string', enum: ['today', 'week', 'month', 'quarter'], description: 'Time range for stats' },
      },
    },
  },
  {
    name: 'get_calls',
    description: 'List recent calls with details',
    parameters: {
      type: 'object',
      properties: {
        leadId: { type: 'string', description: 'Filter by lead ID' },
        limit: { type: 'number', description: 'Max results (default: 20)' },
      },
    },
  },

  // ============================================
  // NOTIFICATIONS
  // ============================================
  {
    name: 'get_notifications',
    description: 'Get user notifications (unread or all)',
    parameters: {
      type: 'object',
      properties: {
        unreadOnly: { type: 'boolean', description: 'Only show unread notifications' },
        limit: { type: 'number', description: 'Max results (default: 20)' },
      },
    },
  },
  {
    name: 'get_unread_notification_count',
    description: 'Get the count of unread notifications',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'mark_notifications_read',
    description: 'Mark all notifications as read',
    parameters: {
      type: 'object',
      properties: {},
    },
  },

  // ============================================
  // LIST/SEARCH FUNCTIONS (Missing from existing)
  // ============================================
  {
    name: 'list_campaigns',
    description: 'List all marketing campaigns with status and basic stats',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'SCHEDULED'] },
        limit: { type: 'number', description: 'Max results (default: 20)' },
      },
    },
  },
  {
    name: 'list_workflows',
    description: 'List all automation workflows with status',
    parameters: {
      type: 'object',
      properties: {
        activeOnly: { type: 'boolean', description: 'Only show active workflows' },
      },
    },
  },
  {
    name: 'list_tasks',
    description: 'List tasks with optional filters',
    parameters: {
      type: 'object',
      properties: {
        leadId: { type: 'string', description: 'Filter by lead' },
        status: { type: 'string', enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] },
        limit: { type: 'number', description: 'Max results (default: 20)' },
      },
    },
  },
  {
    name: 'list_email_templates',
    description: 'List all email templates',
    parameters: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Filter by category' },
      },
    },
  },
  {
    name: 'list_sms_templates',
    description: 'List all SMS templates',
    parameters: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Filter by category' },
      },
    },
  },

  // ============================================
  // CUSTOM FIELDS
  // ============================================
  {
    name: 'get_custom_fields',
    description: 'List all custom field definitions for the CRM',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'create_custom_field',
    description: 'Create a new custom field for leads (e.g., "Property Type", "Budget Range")',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Field display name' },
        fieldKey: { type: 'string', description: 'Unique key (auto-generated from name if omitted)' },
        type: {
          type: 'string',
          enum: ['TEXT', 'NUMBER', 'DATE', 'SELECT', 'MULTI_SELECT', 'BOOLEAN', 'EMAIL', 'PHONE', 'URL', 'TEXTAREA'],
          description: 'Field data type',
        },
        required: { type: 'boolean', description: 'Whether the field is required' },
        options: {
          type: 'array',
          items: { type: 'string' },
          description: 'Options for SELECT/MULTI_SELECT fields',
        },
        placeholder: { type: 'string', description: 'Placeholder text' },
      },
      required: ['name', 'type'],
    },
  },
  {
    name: 'delete_custom_field',
    description: 'Delete a custom field definition',
    parameters: {
      type: 'object',
      properties: {
        fieldId: { type: 'string', description: 'ID of the custom field to delete' },
      },
      required: ['fieldId'],
    },
  },

  // ============================================
  // EXPORT DATA
  // ============================================
  {
    name: 'export_data',
    description: 'Export data as CSV (leads, activities, campaigns, etc.)',
    parameters: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['leads', 'activities', 'campaigns', 'tasks'],
          description: 'Type of data to export',
        },
        format: { type: 'string', enum: ['csv', 'json'], description: 'Export format (default: csv)' },
        status: { type: 'string', description: 'Filter by status' },
      },
      required: ['type'],
    },
  },

  // ============================================
  // SAVED FILTERS & REPORTS
  // ============================================
  {
    name: 'list_saved_filters',
    description: 'List saved filter views for leads',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'create_saved_filter',
    description: 'Save a lead filter view for quick access',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Filter name' },
        filterConfig: {
          type: 'object',
          description: 'Filter configuration (status, score range, tags, etc.)',
        },
        color: { type: 'string', description: 'Color for the filter (hex)' },
        icon: { type: 'string', description: 'Icon name' },
      },
      required: ['name', 'filterConfig'],
    },
  },
  {
    name: 'delete_saved_filter',
    description: 'Delete a saved filter view',
    parameters: {
      type: 'object',
      properties: {
        filterId: { type: 'string', description: 'ID of the filter to delete' },
      },
      required: ['filterId'],
    },
  },
  {
    name: 'list_saved_reports',
    description: 'List all saved reports',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'create_saved_report',
    description: 'Create a saved report configuration',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Report name' },
        description: { type: 'string' },
        type: { type: 'string', enum: ['leads', 'campaigns', 'activities', 'revenue'] },
        config: { type: 'object', description: 'Report configuration' },
      },
      required: ['name', 'type', 'config'],
    },
  },
  {
    name: 'delete_saved_report',
    description: 'Delete a saved report',
    parameters: {
      type: 'object',
      properties: {
        reportId: { type: 'string', description: 'ID of the report to delete' },
      },
      required: ['reportId'],
    },
  },

  // ============================================
  // TEAM MANAGEMENT
  // ============================================
  {
    name: 'list_team_members',
    description: 'List all team members in the organization',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_user_profile',
    description: 'Get the current user profile information',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'update_user_profile',
    description: 'Update user profile (name, phone, timezone)',
    parameters: {
      type: 'object',
      properties: {
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        phone: { type: 'string' },
        timezone: { type: 'string', description: 'Timezone (e.g., America/New_York)' },
      },
    },
  },
  {
    name: 'get_business_settings',
    description: 'Get organization/business settings',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'update_business_settings',
    description: 'Update organization/business settings',
    parameters: {
      type: 'object',
      properties: {
        companyName: { type: 'string' },
        industry: { type: 'string' },
        website: { type: 'string' },
        phone: { type: 'string' },
        address: { type: 'string' },
        city: { type: 'string' },
        state: { type: 'string' },
        timezone: { type: 'string' },
      },
    },
  },

  // ============================================
  // APPOINTMENTS LIST
  // ============================================
  {
    name: 'list_appointments',
    description: 'List upcoming and recent appointments/meetings',
    parameters: {
      type: 'object',
      properties: {
        leadId: { type: 'string', description: 'Filter by lead' },
        status: { type: 'string', enum: ['SCHEDULED', 'CONFIRMED', 'CANCELLED', 'COMPLETED'] },
        upcoming: { type: 'boolean', description: 'Only show upcoming (default: true)' },
        limit: { type: 'number', description: 'Max results (default: 20)' },
      },
    },
  },
];

export interface FunctionArgs {
  [key: string]: string | number | boolean | string[] | Record<string, unknown> | undefined;
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
  updates?: Record<string, unknown>;
  
  // Analytics fields
  timeRange?: string;
  
  // Integration fields
  provider?: string;
  apiKey?: string;
  additionalConfig?: Record<string, unknown>;

  // Pipeline fields
  pipelineId?: string;
  stageId?: string;
  stageName?: string;
  stages?: string[];

  // Goal fields
  goalId?: string;
  metricType?: string;
  targetValue?: number;
  currentValue?: number;
  period?: string;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
  activeOnly?: boolean;

  // Call fields
  direction?: string;
  phoneNumber?: string;
  outcome?: string;
  followUpDate?: string;

  // Notification fields
  unreadOnly?: boolean;

  // Custom field fields
  fieldId?: string;
  fieldKey?: string;
  fieldType?: string;
  options?: string[];
  placeholder?: string;

  // Export fields
  format?: string;

  // Saved filter/report fields
  filterId?: string;
  reportId?: string;
  filterConfig?: Record<string, unknown>;
  config?: Record<string, unknown>;
  icon?: string;

  // Settings fields
  companyName?: string;
  industry?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  timezone?: string;

  // Appointment list fields
  upcoming?: boolean;
}

/**
 * Lists of destructive vs read-only AI functions for safety gates.
 * Destructive functions require user confirmation before execution.
 * Admin-only functions require ADMIN or MANAGER role.
 */
export const DESTRUCTIVE_FUNCTIONS = new Set([
  'delete_lead', 'send_email', 'send_sms', 'delete_task',
  'delete_note', 'delete_tag', 'delete_campaign', 'delete_workflow',
  'delete_email_template', 'delete_sms_template', 'bulk_delete_leads',
  'send_campaign', 'disconnect_integration',
  'delete_goal', 'delete_custom_field', 'delete_saved_filter', 'delete_saved_report',
]);

export const ADMIN_ONLY_FUNCTIONS = new Set([
  'delete_lead', 'bulk_delete_leads', 'bulk_update_leads',
  'delete_campaign', 'delete_workflow', 'delete_email_template',
  'delete_sms_template', 'disconnect_integration',
  'delete_custom_field', 'update_business_settings',
]);

export const READ_ONLY_FUNCTIONS = new Set([
  'get_lead_count', 'search_leads', 'get_recent_activities',
  'get_lead_details', 'get_dashboard_stats', 'get_lead_analytics',
  'get_conversion_funnel', 'get_campaign_analytics',
  'predict_conversion', 'get_next_action', 'analyze_engagement',
  'identify_at_risk_leads',
  'get_pipelines', 'get_pipeline_leads', 'list_goals',
  'get_call_stats', 'get_calls', 'get_notifications', 'get_unread_notification_count',
  'list_campaigns', 'list_workflows', 'list_tasks',
  'list_email_templates', 'list_sms_templates',
  'get_custom_fields', 'export_data',
  'list_saved_filters', 'list_saved_reports',
  'list_team_members', 'get_user_profile', 'get_business_settings',
  'list_appointments',
]);
