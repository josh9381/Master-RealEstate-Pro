/**
 * Campaign Executor Service
 * Handles execution of campaigns - sending emails/SMS to leads
 */

import { logger } from '../lib/logger'
import { prisma } from '../config/database';
import { sendBulkEmails } from './email.service';
import { sendBulkSMS } from './sms.service';
import { pushCampaignUpdate } from '../config/socket';
import { compileEmailBlocks, compilePlainText, CanSpamOptions } from '../utils/mjmlCompiler';
import { readAttachmentAsBase64 } from '../config/upload';
import { ensureUnsubscribeToken } from '../controllers/unsubscribe.controller';
import { calculateOptimalSendTimes, groupLeadsBySendSlot, OptimizationStrategy } from './send-time-optimizer.service';
import { checkMonthlyMessageLimit } from '../middleware/planLimits';
import Handlebars from 'handlebars';

/**
 * Create CampaignLead tracking rows for per-recipient activity logging
 */
async function createCampaignLeadRows(campaignId: string, organizationId: string, leadIds: string[]) {
  if (leadIds.length === 0) return;
  try {
    await prisma.campaignLead.createMany({
      data: leadIds.map((leadId) => ({
        campaignId,
        leadId,
        organizationId,
        status: 'PENDING' as const,
      })),
      skipDuplicates: true,
    });
    logger.info(`[CAMPAIGN] Created ${leadIds.length} CampaignLead tracking rows`);
  } catch (err) {
    logger.error('[CAMPAIGN] Failed to create CampaignLead rows:', err);
  }
}

/**
 * Update CampaignLead status after sending
 */
async function updateCampaignLeadStatus(
  campaignId: string,
  leadId: string,
  status: 'SENT' | 'BOUNCED',
  timestamp: Date = new Date()
) {
  try {
    await prisma.campaignLead.updateMany({
      where: { campaignId, leadId },
      data: {
        status,
        ...(status === 'SENT' ? { sentAt: timestamp } : { bouncedAt: timestamp }),
      },
    });
  } catch (error) {
    logger.error('[CAMPAIGN] Failed to record campaign activity:', error)
    // Non-critical — don't fail the send
  }
}

interface CampaignExecutionOptions {
  campaignId: string;
  leadIds?: string[]; // Optional: specific leads to send to
  filters?: {
    status?: string[];
    tags?: string[];
    minScore?: number;
    source?: string[];
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
    const leads = await getTargetLeads(campaign.organizationId, leadIds, filters, campaignTagId);

    if (leads.length === 0) {
      return {
        success: true,
        totalLeads: 0,
        sent: 0,
        failed: 0,
        errors: ['No leads found matching criteria'],
      };
    }

    logger.info(`[CAMPAIGN] Executing campaign ${campaign.name} to ${leads.length} leads`);

    // Monthly sending limit check
    const msgType = campaign.type === 'EMAIL' ? 'emails' as const : 'sms' as const;
    const monthlyCheck = await checkMonthlyMessageLimit(campaign.organizationId, msgType);
    if (!monthlyCheck.allowed) {
      return {
        success: false,
        totalLeads: leads.length,
        sent: 0,
        failed: leads.length,
        errors: [`Monthly ${msgType} limit reached (${monthlyCheck.sent}/${monthlyCheck.limit}). Upgrade your plan for higher limits.`],
      };
    }

    // Send-time optimization: If enabled, calculate per-lead optimal times
    const optimizationStrategy = (campaign.sendTimeOptimization || 'none') as OptimizationStrategy;
    if (optimizationStrategy !== 'none') {
      logger.info(`[CAMPAIGN] Send-time optimization: ${optimizationStrategy}`);
      
      const optimResult = await calculateOptimalSendTimes(
        leads.map((l) => l.id),
        optimizationStrategy
      );
      
      const groups = groupLeadsBySendSlot(optimResult.slots);
      logger.info(`[CAMPAIGN] ${optimResult.uniqueTimeSlots} time slots across ${optimResult.totalSlots} recipients`);
      
      const now = new Date();
      const immediateLeadIds = new Set<string>();
      const deferredGroups: Array<{ sendAt: Date; leadIds: string[] }> = [];
      
      for (const [isoTime, groupLeadIds] of groups) {
        const sendAt = new Date(isoTime);
        // If within 5 minutes of now, send immediately
        if (sendAt.getTime() - now.getTime() < 5 * 60 * 1000) {
          groupLeadIds.forEach((id) => immediateLeadIds.add(id));
        } else {
          deferredGroups.push({ sendAt, leadIds: groupLeadIds });
        }
      }
      
      // Store deferred sends in CampaignLead metadata for the scheduler to pick up
      // Use a transaction to ensure all deferred groups are stored atomically
      if (deferredGroups.length > 0) {
        await prisma.$transaction(
          deferredGroups.map((group) =>
            prisma.campaignLead.updateMany({
              where: {
                campaignId,
                leadId: { in: group.leadIds },
              },
              data: {
                metadata: { scheduledSendAt: group.sendAt.toISOString(), optimizationStrategy },
              },
            })
          )
        );
      }
      
      // Filter leads for immediate sending only
      if (immediateLeadIds.size < leads.length) {
        const deferredCount = leads.length - immediateLeadIds.size;
        logger.info(`[CAMPAIGN] Sending ${immediateLeadIds.size} now, ${deferredCount} deferred for optimal times`);
        
        // Only keep leads that should be sent now
        const immLeads = leads.filter((l) => immediateLeadIds.has(l.id));
        leads.length = 0;
        leads.push(...immLeads);
      }
    }

    // Set campaign status to SENDING before execution begins
    // This prevents confusion if execution crashes mid-send
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'SENDING' },
    });

    // A/B Test: Split audience 50/50 if campaign is an A/B test
    let result: { success: number; failed: number };

    if (campaign.isABTest && campaign.abTestData) {
      logger.info(`[CAMPAIGN] A/B Test detected — splitting audience 50/50`);
      result = await executeABTestCampaign(campaign, leads);
    } else if (campaign.type === 'EMAIL') {
      result = await sendEmailCampaign(campaign, leads);
    } else if (campaign.type === 'SMS') {
      result = await sendSMSCampaign(campaign, leads);
    } else {
      throw new Error(`Campaign type ${campaign.type} not supported`);
    }

    // Update campaign metrics and spent
    const unitCost = campaign.type === 'EMAIL' ? 0.01 : campaign.type === 'SMS' ? 0.10 : 0.50;
    const spentAmount = result.success * unitCost;

    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        sent: { increment: result.success },
        spent: { increment: spentAmount },
        status: 'ACTIVE',
        startDate: campaign.startDate || new Date(),
        lastSentAt: new Date(),
        audience: leads.length,
      },
    });

    logger.info(
      `[CAMPAIGN] Completed: ${result.success} sent, ${result.failed} failed`
    );

    // Push real-time campaign completion event
    pushCampaignUpdate(campaign.organizationId, {
      id: campaignId,
      name: campaign.name,
      status: 'ACTIVE',
      sent: result.success,
      failed: result.failed,
    });

    return {
      success: true,
      totalLeads: leads.length,
      sent: result.success,
      failed: result.failed,
    };
  } catch (error) {
    logger.error('[CAMPAIGN] Execution failed:', error);
    // Rollback status from SENDING to prevent stuck campaigns
    try {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: 'DRAFT' },
      });
      logger.info(`[CAMPAIGN] Rolled back campaign ${campaignId} status from SENDING to DRAFT`);
    } catch (rollbackErr) {
      logger.error('[CAMPAIGN] Status rollback failed:', rollbackErr);
    }
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
  organizationId: string,
  leadIds?: string[],
  filters?: CampaignExecutionOptions['filters'],
  tagId?: string | null
) {
  // If specific leads provided, use those (scoped to org)
  if (leadIds && leadIds.length > 0) {
    return await prisma.lead.findMany({
      where: {
        id: { in: leadIds },
        organizationId,
      },
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
  }

  // Build filter query
  const where: any = { organizationId };

  // Collect tag IDs from campaign tag and filter tags
  const tagIds: string[] = [];
  if (tagId) {
    tagIds.push(tagId);
  }
  if (filters?.tags && filters.tags.length > 0) {
    tagIds.push(...filters.tags);
  }
  if (tagIds.length > 0) {
    where.tags = {
      some: {
        id: { in: tagIds },
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

    if (filters.source && filters.source.length > 0) {
      where.source = { in: filters.source };
    }
  }

  // Safety check: require at least one audience selection criterion
  // to prevent accidentally sending to the entire organization
  const hasAudienceCriteria = tagIds.length > 0 ||
    (filters?.status && filters.status.length > 0) ||
    filters?.minScore !== undefined ||
    (filters?.source && filters.source.length > 0);

  if (!hasAudienceCriteria) {
    logger.warn('[CAMPAIGN] No audience criteria specified — refusing to send to all org leads');
    return [];
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
 * Chunk array into smaller batches
 */
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Send email campaign to leads with batch processing
 */
async function sendEmailCampaign(campaign: any, leads: any[]) {
  // Load business settings for CAN-SPAM footer
  const businessSettings = await prisma.businessSettings.findFirst({
    where: { organizationId: campaign.organizationId },
    select: { companyName: true, address: true },
  });
  
  const APP_URL = process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
  
  // CAN-SPAM options — use Handlebars variables as placeholders
  // (the actual unsubscribe URL is per-lead, injected via template vars below)
  const canSpam: CanSpamOptions = {
    companyName: businessSettings?.companyName || campaign.organization?.name || 'Our Company',
    physicalAddress: businessSettings?.address || 'Address on file',
  };

  // Detect block-based vs legacy content
  let isBlockBased = false;
  try {
    const parsed = JSON.parse(campaign.body || '');
    isBlockBased = parsed && parsed.__emailBlocks;
  } catch {
    // Legacy plain text content
  }

  // For block-based emails, compile blocks to HTML via MJML first,
  // then run Handlebars on the result for variable substitution.
  // CAN-SPAM footer with {{unsubscribeUrl}} is injected at compile time.
  let compiledBodyTemplate: string;
  if (isBlockBased) {
    const mjmlResult = compileEmailBlocks(campaign.body, { canSpam });
    if (mjmlResult.errors.length > 0) {
      logger.warn(`[CAMPAIGN] MJML compilation warnings:`, mjmlResult.errors);
    }
    compiledBodyTemplate = mjmlResult.html;
  } else {
    // Legacy: plain text or raw HTML — wrap in MJML for consistent rendering
    const mjmlResult = compilePlainText(campaign.body || '', canSpam);
    compiledBodyTemplate = mjmlResult.html;
  }

  // Compile templates with Handlebars for variable substitution
  const subjectTemplate = Handlebars.compile(campaign.subject || '');
  const bodyTemplate = Handlebars.compile(compiledBodyTemplate);

  // Load campaign attachments (base64 encoded for SendGrid)
  let campaignAttachments: Array<{ content: string; filename: string; type?: string }> = [];
  if (campaign.attachments && Array.isArray(campaign.attachments)) {
    for (const att of campaign.attachments as Array<{ path: string; filename: string }>) {
      const encoded = readAttachmentAsBase64(att.path);
      if (encoded) {
        campaignAttachments.push(encoded);
      }
    }
  }

  // Prepare emails for bulk send — generate unsubscribe tokens for each lead
  const emails = [];
  for (const lead of leads.filter((l) => l.email)) {
      // Ensure lead has an unsubscribe token for CAN-SPAM compliance
      let unsubscribeToken: string;
      try {
        unsubscribeToken = await ensureUnsubscribeToken(lead.id);
      } catch (error) {
        logger.error('[CAMPAIGN] Failed to generate unsubscribe token:', error)
        // Generate a random opaque token as fallback instead of exposing leadId
        const { randomBytes } = await import('crypto');
        unsubscribeToken = randomBytes(32).toString('hex');
      }
      const unsubscribeUrl = `${APP_URL}/api/unsubscribe/${unsubscribeToken}`;

      // Prepare template data — escape Handlebars syntax in lead fields to prevent injection
      const safeFirst = lead.firstName || '';
      const safeLast = lead.lastName || '';
      const fullName = `${safeFirst} ${safeLast}`.trim() || 'Valued Customer';
      const esc = (val: unknown): string => {
        if (val == null) return '';
        // Escape triple-stash first (bypasses Handlebars HTML escaping), then double-stash
        return String(val).replace(/\{\{\{/g, '\\{{{').replace(/\}\}\}/g, '\\}}}').replace(/\{\{/g, '\\{{').replace(/\}\}/g, '\\}}');
      };
      const templateData = {
        lead: {
          name: esc(fullName),
          firstName: esc(safeFirst || fullName),
          lastName: esc(safeLast),
          email: esc(lead.email),
          phone: esc(lead.phone),
          company: esc(lead.company),
          status: esc(lead.status),
          score: lead.score,
        },
        user: lead.assignedTo
          ? {
              firstName: lead.assignedTo.firstName,
              lastName: lead.assignedTo.lastName,
              email: lead.assignedTo.email,
            }
          : {
              firstName: 'Team',
              lastName: '',
              email: 'team@company.com',
            },
        company: {
          name: businessSettings?.companyName || campaign.organization?.name || 'Our Company',
          address: businessSettings?.address || '',
        },
        unsubscribeUrl,
        currentDate: new Date().toLocaleDateString(),
        currentTime: new Date().toLocaleTimeString(),
      };

      // Compile with lead data
      const subject = subjectTemplate(templateData);
      let html = bodyTemplate(templateData);

      // Replace any unresolved placeholder tokens with [Not Set]
      html = html.replace(/\{\{[^}]+\}\}/g, '[Not Set]');
      const cleanSubject = subject.replace(/\{\{[^}]+\}\}/g, '[Not Set]');

      emails.push({
        to: lead.email,
        subject: cleanSubject,
        html,
        leadId: lead.id,
        ...(campaignAttachments.length > 0 ? { attachments: campaignAttachments } : {}),
      });
  }

  // Process in batches of 100
  const BATCH_SIZE = 100;
  const batches = chunkArray(emails, BATCH_SIZE);
  const userId = campaign.user?.id || campaign.userId;
  
  let totalSuccess = 0;
  let totalFailed = 0;

  logger.info(`[CAMPAIGN] Processing ${emails.length} emails in ${batches.length} batches of ${BATCH_SIZE}`);

  // Create CampaignLead tracking rows for per-recipient activity
  await createCampaignLeadRows(
    campaign.id,
    campaign.organizationId,
    emails.map((e) => e.leadId).filter(Boolean) as string[]
  );

  // Process batches in parallel (3 at a time to avoid overwhelming the email service)
  const PARALLEL_BATCHES = 3;
  for (let i = 0; i < batches.length; i += PARALLEL_BATCHES) {
    const batchGroup = batches.slice(i, i + PARALLEL_BATCHES);
    
    const results = await Promise.allSettled(
      batchGroup.map((batch, batchIndex) => {
        const actualBatchNum = i + batchIndex + 1;
        logger.info(`[CAMPAIGN] Sending batch ${actualBatchNum}/${batches.length} (${batch.length} emails)`);
        return sendBulkEmails(batch, campaign.id, userId, campaign.organizationId);
      })
    );

    // Aggregate results
    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        totalSuccess += result.value.success;
        totalFailed += result.value.failed;
      } else {
        logger.error(`[CAMPAIGN] Batch failed:`, result.reason);
        // Count actual batch size, not fixed constant
        const failedBatchIndex = results.indexOf(result);
        const actualBatch = batchGroup[failedBatchIndex];
        totalFailed += actualBatch ? actualBatch.length : BATCH_SIZE;
      }
    });

    // Small delay between batch groups to prevent rate limiting
    if (i + PARALLEL_BATCHES < batches.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  logger.info(`[CAMPAIGN] Email campaign completed: ${totalSuccess} sent, ${totalFailed} failed`);

  return { success: totalSuccess, failed: totalFailed };
}

/**
 * Send SMS campaign to leads with batch processing
 */
async function sendSMSCampaign(campaign: any, leads: any[]) {
  // Compile SMS template
  const bodyTemplate = Handlebars.compile(campaign.body || '');

  // TCPA compliance footer
  const TCPA_FOOTER = '\n\nReply STOP to opt out.';

  // MMS media URL from campaign
  const campaignMediaUrl = campaign.mediaUrl ? [campaign.mediaUrl] : undefined;

  // Prepare SMS for bulk send — filter out opted-out leads
  const messages = leads
    .filter((lead) => lead.phone && lead.smsOptIn !== false) // Only leads with phone AND not opted out
    .map((lead) => {
      // Prepare template data — escape Handlebars syntax in lead fields to prevent injection
      const safeFirst = lead.firstName || '';
      const safeLast = lead.lastName || '';
      const fullName = `${safeFirst} ${safeLast}`.trim() || 'Valued Customer';
      const esc = (val: unknown): string => {
        if (val == null) return '';
        // Escape triple-stash first (bypasses Handlebars HTML escaping), then double-stash
        return String(val).replace(/\{\{\{/g, '\\{{{').replace(/\}\}\}/g, '\\}}}').replace(/\{\{/g, '\\{{').replace(/\}\}/g, '\\}}');
      };
      const templateData = {
        lead: {
          name: esc(fullName),
          firstName: esc(safeFirst || fullName),
          lastName: esc(safeLast),
          email: esc(lead.email),
          phone: esc(lead.phone),
          company: esc(lead.company),
          status: esc(lead.status),
          score: lead.score,
        },
        user: lead.assignedTo
          ? {
              firstName: lead.assignedTo.firstName,
              lastName: lead.assignedTo.lastName,
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
        message: message + TCPA_FOOTER,
        leadId: lead.id,
        ...(campaignMediaUrl ? { mediaUrl: campaignMediaUrl } : {}),
      };
    });

  // Process in batches of 100
  const BATCH_SIZE = 100;
  const batches = chunkArray(messages, BATCH_SIZE);
  const userId = campaign.user?.id || campaign.userId;
  
  let totalSuccess = 0;
  let totalFailed = 0;

  logger.info(`[CAMPAIGN] Processing ${messages.length} SMS in ${batches.length} batches of ${BATCH_SIZE}`);

  // Create CampaignLead tracking rows for per-recipient activity
  await createCampaignLeadRows(
    campaign.id,
    campaign.organizationId,
    messages.map((m) => m.leadId).filter(Boolean) as string[]
  );

  // Process batches in parallel (3 at a time to avoid overwhelming the SMS service)
  const PARALLEL_BATCHES = 3;
  for (let i = 0; i < batches.length; i += PARALLEL_BATCHES) {
    const batchGroup = batches.slice(i, i + PARALLEL_BATCHES);
    
    const results = await Promise.allSettled(
      batchGroup.map((batch, batchIndex) => {
        const actualBatchNum = i + batchIndex + 1;
        logger.info(`[CAMPAIGN] Sending batch ${actualBatchNum}/${batches.length} (${batch.length} SMS)`);
        return sendBulkSMS(batch, campaign.id, userId, campaign.organizationId);
      })
    );

    // Aggregate results
    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        totalSuccess += result.value.success;
        totalFailed += result.value.failed;
      } else {
        logger.error(`[CAMPAIGN] Batch failed:`, result.reason);
        // Count actual batch size, not fixed constant
        const failedBatchIndex = results.indexOf(result);
        const actualBatch = batchGroup[failedBatchIndex];
        totalFailed += actualBatch ? actualBatch.length : BATCH_SIZE;
      }
    });

    // Small delay between batch groups to prevent rate limiting
    if (i + PARALLEL_BATCHES < batches.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  logger.info(`[CAMPAIGN] SMS campaign completed: ${totalSuccess} sent, ${totalFailed} failed`);

  return { success: totalSuccess, failed: totalFailed };
}

/**
 * Execute an A/B test campaign — split audience 50/50 and send variant A/B
 */
async function executeABTestCampaign(campaign: any, leads: any[]) {
  const abTestData = campaign.abTestData as any;
  const variantSubject = abTestData?.variantSubject || campaign.subject || '';

  // Shuffle leads for fair distribution
  const shuffled = [...leads].sort(() => Math.random() - 0.5);
  const midpoint = Math.ceil(shuffled.length / 2);
  const groupA = shuffled.slice(0, midpoint);
  const groupB = shuffled.slice(midpoint);

  logger.info(`[A/B TEST] Variant A: ${groupA.length} leads, Variant B: ${groupB.length} leads`);

  // Find or create A/B test record
  let abTest = await prisma.aBTest.findFirst({
    where: {
      organizationId: campaign.organizationId,
      name: `${campaign.name} A/B Test`,
    },
  });

  if (!abTest) {
    abTest = await prisma.aBTest.create({
      data: {
        name: `${campaign.name} A/B Test`,
        type: campaign.type === 'SMS' ? 'SMS_CONTENT' : 'EMAIL_SUBJECT',
        status: 'RUNNING',
        organizationId: campaign.organizationId,
        createdBy: campaign.createdById,
        variantA: { subject: campaign.subject || 'Variant A' },
        variantB: { subject: variantSubject || 'Variant B' },
        startDate: new Date(),
        participantCount: leads.length,
      },
    });
  }

  let totalSuccess = 0;
  let totalFailed = 0;

  if (campaign.type === 'EMAIL') {
    // Send Variant A with original subject
    const resultA = await sendEmailCampaign(campaign, groupA);

    // Send Variant B with alternative subject
    const variantBCampaign = {
      ...campaign,
      subject: variantSubject || campaign.subject,
    };
    const resultB = await sendEmailCampaign(variantBCampaign, groupB);

    totalSuccess = resultA.success + resultB.success;
    totalFailed = resultA.failed + resultB.failed;

    // Create A/B test result records for tracking
    const createResults = [];
    for (const lead of groupA) {
      createResults.push({
        testId: abTest.id,
        variant: 'A',
        leadId: lead.id,
        campaignId: campaign.id,
        organizationId: campaign.organizationId,
      });
    }
    for (const lead of groupB) {
      createResults.push({
        testId: abTest.id,
        variant: 'B',
        leadId: lead.id,
        campaignId: campaign.id,
        organizationId: campaign.organizationId,
      });
    }
    await prisma.aBTestResult.createMany({ data: createResults });
  } else if (campaign.type === 'SMS') {
    const resultA = await sendSMSCampaign(campaign, groupA);

    const variantBCampaign = {
      ...campaign,
      body: abTestData?.variantBody || campaign.body,
    };
    const resultB = await sendSMSCampaign(variantBCampaign, groupB);

    totalSuccess = resultA.success + resultB.success;
    totalFailed = resultA.failed + resultB.failed;
  }

  // Update A/B test participant count
  await prisma.aBTest.update({
    where: { id: abTest.id },
    data: { participantCount: totalSuccess },
  });

  logger.info(`[A/B TEST] Completed: ${totalSuccess} sent, ${totalFailed} failed`);
  return { success: totalSuccess, failed: totalFailed };
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
  const leads = await getTargetLeads(campaign.organizationId, leadIds, undefined, campaignTagId);
  const sampleLeads = leads.slice(0, 5);  if (campaign.type === 'EMAIL') {
    // Compile blocks/legacy content through MJML
    let isBlockBased = false;
    try {
      const parsed = JSON.parse(campaign.body || '');
      isBlockBased = parsed && parsed.__emailBlocks;
    } catch { /* legacy text */ }

    let compiledBody: string;
    if (isBlockBased) {
      const mjmlResult = compileEmailBlocks(campaign.body || '');
      compiledBody = mjmlResult.html;
    } else {
      const mjmlResult = compilePlainText(campaign.body || '');
      compiledBody = mjmlResult.html;
    }

    const subjectTemplate = Handlebars.compile(campaign.subject || '');
    const bodyTemplate = Handlebars.compile(compiledBody);

    return sampleLeads.map((lead) => {
      const safeFirst = lead.firstName || '';
      const safeLast = lead.lastName || '';
      const fullName = `${safeFirst} ${safeLast}`.trim() || 'Valued Customer';
      
      const templateData = {
        lead: {
          name: fullName,
          firstName: safeFirst || fullName,
          lastName: safeLast,
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
      const safeFirst = lead.firstName || '';
      const safeLast = lead.lastName || '';
      const fullName = `${safeFirst} ${safeLast}`.trim() || 'Valued Customer';
      
      const templateData = {
        lead: {
          name: fullName,
          firstName: safeFirst || fullName,
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
