/**
 * Campaign Executor Service
 * Handles execution of campaigns - sending emails/SMS to leads
 */

import { prisma } from '../config/database';
import { sendBulkEmails } from './email.service';
import { sendBulkSMS } from './sms.service';
import Handlebars from 'handlebars';

interface CampaignExecutionOptions {
  campaignId: string;
  leadIds?: string[]; // Optional: specific leads to send to
  filters?: {
    status?: string[];
    tags?: string[];
    minScore?: number;
  };
}

interface CampaignExecutionResult {
  success: boolean;
  totalLeads: number;
  sent: number;
  failed: number;
  errors?: string[];
}

/**
 * Execute a campaign - send to selected leads
 */
export async function executeCampaign(
  options: CampaignExecutionOptions
): Promise<CampaignExecutionResult> {
  const { campaignId, leadIds, filters } = options;

  try {
    // Get campaign details with user ID
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        tags: true,
        user: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // Get leads to send to
    const campaignTagId = campaign.tags && campaign.tags.length > 0 ? campaign.tags[0].id : null;
    const leads = await getTargetLeads(leadIds, filters, campaignTagId);

    if (leads.length === 0) {
      return {
        success: true,
        totalLeads: 0,
        sent: 0,
        failed: 0,
        errors: ['No leads found matching criteria'],
      };
    }

    console.log(`[CAMPAIGN] Executing campaign ${campaign.name} to ${leads.length} leads`);

    // Send based on campaign type
    let result: { success: number; failed: number };

    if (campaign.type === 'EMAIL') {
      result = await sendEmailCampaign(campaign, leads);
    } else if (campaign.type === 'SMS') {
      result = await sendSMSCampaign(campaign, leads);
    } else {
      throw new Error(`Campaign type ${campaign.type} not supported`);
    }

    // Update campaign metrics
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        sent: { increment: result.success },
        status: 'ACTIVE',
        startDate: campaign.startDate || new Date(),
      },
    });

    console.log(
      `[CAMPAIGN] Completed: ${result.success} sent, ${result.failed} failed`
    );

    return {
      success: true,
      totalLeads: leads.length,
      sent: result.success,
      failed: result.failed,
    };
  } catch (error) {
    console.error('[CAMPAIGN] Execution failed:', error);
    return {
      success: false,
      totalLeads: 0,
      sent: 0,
      failed: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}

/**
 * Get target leads for campaign
 */
async function getTargetLeads(
  leadIds?: string[],
  filters?: CampaignExecutionOptions['filters'],
  tagId?: string | null
) {
  // If specific leads provided, use those
  if (leadIds && leadIds.length > 0) {
    return await prisma.lead.findMany({
      where: {
        id: { in: leadIds },
      },
    });
  }

  // Build filter query
  const where: any = {};

  // Filter by campaign tag if set
  if (tagId) {
    where.tags = {
      some: {
        id: tagId,
      },
    };
  }

  // Additional filters
  if (filters) {
    if (filters.status && filters.status.length > 0) {
      where.status = { in: filters.status };
    }

    if (filters.minScore !== undefined) {
      where.score = { gte: filters.minScore };
    }

    if (filters.tags && filters.tags.length > 0) {
      where.tags = {
        some: {
          id: { in: filters.tags },
        },
      };
    }
  }

  // Get leads
  const leads = await prisma.lead.findMany({
    where,
    include: {
      assignedTo: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  return leads;
}

/**
 * Send email campaign to leads
 */
async function sendEmailCampaign(campaign: any, leads: any[]) {
  // Compile email template
  const subjectTemplate = Handlebars.compile(campaign.subject || '');
  const bodyTemplate = Handlebars.compile(campaign.body || '');

  // Prepare emails for bulk send
  const emails = leads
    .filter((lead) => lead.email) // Only leads with email
    .map((lead) => {
      // Prepare template data
      const nameParts = `${lead.firstName} ${lead.lastName}`.split(' ')
      const firstName = nameParts[0] || `${lead.firstName} ${lead.lastName}`
      const lastName = nameParts.slice(1).join(' ') || ''
      
      const templateData = {
        lead: {
          name: `${lead.firstName} ${lead.lastName}`,
          firstName: firstName,
          lastName: lastName,
          email: lead.email,
          phone: lead.phone,
          company: lead.company,
          status: lead.status,
          score: lead.score,
        },
        user: lead.user
          ? {
              firstName: lead.user.firstName,
              lastName: lead.user.lastName,
              email: lead.user.email,
            }
          : {
              firstName: 'Team',
              lastName: '',
              email: 'team@company.com',
            },
        currentDate: new Date().toLocaleDateString(),
        currentTime: new Date().toLocaleTimeString(),
      };

      // Compile with lead data
      const subject = subjectTemplate(templateData);
      const html = bodyTemplate(templateData);

      return {
        to: lead.email,
        subject,
        html,
        leadId: lead.id,
      };
    });

  // Send bulk emails with user's API configuration
  const userId = campaign.user?.id || campaign.userId;
  const result = await sendBulkEmails(emails, campaign.id, userId);

  console.log(`[CAMPAIGN] Email campaign sent using ${userId ? 'user config' : 'default config'}`);

  return result;
}

/**
 * Send SMS campaign to leads
 */
async function sendSMSCampaign(campaign: any, leads: any[]) {
  // Compile SMS template
  const bodyTemplate = Handlebars.compile(campaign.body || '');

  // Prepare SMS for bulk send
  const messages = leads
    .filter((lead) => lead.phone) // Only leads with phone
    .map((lead) => {
      // Prepare template data
      const nameParts = `${lead.firstName} ${lead.lastName}`.split(' ')
      const firstName = nameParts[0] || `${lead.firstName} ${lead.lastName}`
      const lastName = nameParts.slice(1).join(' ') || ''
      
      const templateData = {
        lead: {
          name: `${lead.firstName} ${lead.lastName}`,
          firstName: firstName,
          lastName: lastName,
          email: lead.email,
          phone: lead.phone,
          company: lead.company,
          status: lead.status,
          score: lead.score,
        },
        user: lead.user
          ? {
              firstName: lead.user.firstName,
              lastName: lead.user.lastName,
            }
          : {
              firstName: 'Team',
              lastName: '',
            },
        currentDate: new Date().toLocaleDateString(),
      };

      // Compile with lead data
      const message = bodyTemplate(templateData);

      return {
        to: lead.phone,
        message,
        leadId: lead.id,
      };
    });

  // Send bulk SMS with user's API configuration
  const userId = campaign.user?.id || campaign.userId;
  const result = await sendBulkSMS(messages, campaign.id, userId);

  console.log(`[CAMPAIGN] SMS campaign sent using ${userId ? 'user config' : 'default config'}`);

  return result;
}

/**
 * Preview campaign without sending
 * Returns sample of how messages will look for first 5 leads
 */
export async function previewCampaign(
  campaignId: string,
  leadIds?: string[]
): Promise<any[]> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      tags: true,
    },
  });

  if (!campaign) {
    throw new Error('Campaign not found');
  }

  // Get sample leads
  const campaignTagId = campaign.tags && campaign.tags.length > 0 ? campaign.tags[0].id : null;
  const leads = await getTargetLeads(leadIds, undefined, campaignTagId);
  const sampleLeads = leads.slice(0, 5);  if (campaign.type === 'EMAIL') {
    const subjectTemplate = Handlebars.compile(campaign.subject || '');
    const bodyTemplate = Handlebars.compile(campaign.body || '');

    return sampleLeads.map((lead) => {
      const nameParts = `${lead.firstName} ${lead.lastName}`.split(' ')
      const firstName = nameParts[0] || `${lead.firstName} ${lead.lastName}`
      const lastName = nameParts.slice(1).join(' ') || ''
      
      const templateData = {
        lead: {
          name: `${lead.firstName} ${lead.lastName}`,
          firstName: firstName,
          lastName: lastName,
          email: lead.email,
        },
        currentDate: new Date().toLocaleDateString(),
      };

      return {
        to: lead.email,
        subject: subjectTemplate(templateData),
        body: bodyTemplate(templateData),
      };
    });
  } else if (campaign.type === 'SMS') {
    const bodyTemplate = Handlebars.compile(campaign.body || '');

    return sampleLeads.map((lead) => {
      const nameParts = `${lead.firstName} ${lead.lastName}`.split(' ')
      const firstName = nameParts[0] || `${lead.firstName} ${lead.lastName}`
      
      const templateData = {
        lead: {
          name: `${lead.firstName} ${lead.lastName}`,
          firstName: firstName,
          phone: lead.phone,
        },
        currentDate: new Date().toLocaleDateString(),
      };

      return {
        to: lead.phone,
        message: bodyTemplate(templateData),
      };
    });
  }  return [];
}
