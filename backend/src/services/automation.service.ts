/**
 * Automation Service
 * Handles automation rules and workflow triggers
 */

import { prisma } from '../config/database';
import { sendEmail, sendTemplateEmail } from './email.service';
import { sendSMS, sendTemplateSMS } from './sms.service';

export type WorkflowTriggerType =
  | 'LEAD_CREATED'
  | 'LEAD_STATUS_CHANGED'
  | 'LEAD_ASSIGNED'
  | 'CAMPAIGN_COMPLETED'
  | 'EMAIL_OPENED'
  | 'TIME_BASED'
  | 'SCORE_THRESHOLD'
  | 'TAG_ADDED'
  | 'MANUAL';

export interface AutomationRule {
  id: string;
  name: string;
  description?: string;
  trigger: {
    type: string;
    conditions: Record<string, unknown>;
  };
  actions: Array<{
    type: string;
    config: Record<string, unknown>;
  }>;
  isActive: boolean;
}

export interface TriggerEvent {
  type: WorkflowTriggerType;
  data: Record<string, unknown>;
  leadId?: string;
  userId?: string;
}

/**
 * Process automation trigger
 * Called when an event occurs that might trigger workflows
 */
export async function processTrigger(event: TriggerEvent): Promise<void> {
  try {
    console.log('[AUTOMATION] Processing trigger:', event.type);

    // Find all active workflows matching this trigger
    const workflows = await prisma.workflow.findMany({
      where: {
        isActive: true,
        triggerType: event.type,
      },
    });

    if (workflows.length === 0) {
      console.log('[AUTOMATION] No workflows found for trigger:', event.type);
      return;
    }

    console.log(`[AUTOMATION] Found ${workflows.length} workflows to execute`);

    // Execute each workflow
    for (const workflow of workflows) {
      await executeWorkflow(workflow.id, event);
    }
  } catch (error) {
    console.error('[AUTOMATION] Trigger processing failed:', error);
  }
}

/**
 * Execute a workflow
 */
export async function executeWorkflow(
  workflowId: string,
  event: TriggerEvent
): Promise<void> {
  let executionId: string | undefined;

  try {
    // Get workflow
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
    });

    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    if (!workflow.isActive) {
      console.log('[AUTOMATION] Workflow is not active:', workflowId);
      return;
    }

    console.log('[AUTOMATION] Executing workflow:', workflow.name);

    // Create execution log
    const execution = await prisma.workflowExecution.create({
      data: {
        workflowId,
        status: 'RUNNING',
        leadId: event.leadId,
        metadata: event.data as any,
      },
    });
    executionId = execution.id;

    // Check trigger conditions
    if (workflow.triggerData) {
      const conditionsMet = evaluateConditions(
        workflow.triggerData as Record<string, unknown>,
        event.data
      );
      if (!conditionsMet) {
        console.log('[AUTOMATION] Trigger conditions not met');
        await prisma.workflowExecution.update({
          where: { id: executionId },
          data: {
            status: 'SUCCESS',
            completedAt: new Date(),
          },
        });
        return;
      }
    }

    // Execute actions
    const actions = workflow.actions as Array<{
      type: string;
      config: Record<string, unknown>;
    }>;

    for (const action of actions) {
      await executeAction(action, event);
    }

    // Update workflow stats
    await prisma.workflow.update({
      where: { id: workflowId },
      data: {
        executions: { increment: 1 },
        lastRunAt: new Date(),
      },
    });

    // Mark execution as successful
    await prisma.workflowExecution.update({
      where: { id: executionId },
      data: {
        status: 'SUCCESS',
        completedAt: new Date(),
      },
    });

    console.log('[AUTOMATION] Workflow executed successfully:', workflow.name);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[AUTOMATION] Workflow execution failed:', errorMessage);

    // Mark execution as failed
    if (executionId) {
      await prisma.workflowExecution.update({
        where: { id: executionId },
        data: {
          status: 'FAILED',
          error: errorMessage,
          completedAt: new Date(),
        },
      });
    }
  }
}

/**
 * Execute a single action
 */
async function executeAction(
  action: { type: string; config: Record<string, unknown> },
  event: TriggerEvent
): Promise<void> {
  console.log('[AUTOMATION] Executing action:', action.type);

  switch (action.type) {
    case 'send_email':
      await executeSendEmailAction(action.config, event);
      break;

    case 'send_sms':
      await executeSendSMSAction(action.config, event);
      break;

    case 'create_task':
      await executeCreateTaskAction(action.config, event);
      break;

    case 'update_lead_status':
      await executeUpdateLeadStatusAction(action.config, event);
      break;

    case 'add_tag':
      await executeAddTagAction(action.config, event);
      break;

    case 'wait':
      await executeWaitAction(action.config);
      break;

    default:
      console.warn('[AUTOMATION] Unknown action type:', action.type);
  }
}

/**
 * Send Email Action
 */
async function executeSendEmailAction(
  config: Record<string, unknown>,
  event: TriggerEvent
): Promise<void> {
  const { templateId, to, subject, body } = config;

  if (templateId) {
    // Use template
    await sendTemplateEmail(
      templateId as string,
      to as string,
      event.data,
      { leadId: event.leadId }
    );
  } else {
    // Direct email
    await sendEmail({
      to: to as string,
      subject: subject as string,
      html: body as string,
      leadId: event.leadId,
    });
  }
}

/**
 * Send SMS Action
 */
async function executeSendSMSAction(
  config: Record<string, unknown>,
  event: TriggerEvent
): Promise<void> {
  const { templateId, to, message } = config;

  if (templateId) {
    // Use template
    await sendTemplateSMS(
      templateId as string,
      to as string,
      event.data,
      { leadId: event.leadId }
    );
  } else {
    // Direct SMS
    await sendSMS({
      to: to as string,
      message: message as string,
      leadId: event.leadId,
    });
  }
}

/**
 * Create Task Action
 */
async function executeCreateTaskAction(
  config: Record<string, unknown>,
  event: TriggerEvent
): Promise<void> {
  const { title, description, dueDate, priority, assignedToId } = config;

  await prisma.task.create({
    data: {
      title: title as string,
      description: description as string,
      dueDate: new Date(dueDate as string),
      priority: (priority || 'MEDIUM') as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
      assignedToId: assignedToId as string,
      leadId: event.leadId || undefined,
      status: 'PENDING',
    },
  });
}

/**
 * Update Lead Status Action
 */
async function executeUpdateLeadStatusAction(
  config: Record<string, unknown>,
  event: TriggerEvent
): Promise<void> {
  const { status } = config;

  if (!event.leadId) {
    console.warn('[AUTOMATION] Cannot update lead status: no leadId');
    return;
  }

  await prisma.lead.update({
    where: { id: event.leadId },
    data: {
      status: status as 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL' | 'NEGOTIATION' | 'WON' | 'LOST',
    },
  });

  // Create activity
  await prisma.activity.create({
    data: {
      type: 'STATUS_CHANGED',
      title: 'Status Changed by Automation',
      description: `Lead status changed to ${status}`,
      leadId: event.leadId,
      userId: event.userId || 'system',
    },
  });
}

/**
 * Add Tag Action
 */
async function executeAddTagAction(
  config: Record<string, unknown>,
  event: TriggerEvent
): Promise<void> {
  const { tagId } = config;

  if (!event.leadId) {
    console.warn('[AUTOMATION] Cannot add tag: no leadId');
    return;
  }

  // Get or create tag
  const tag = await prisma.tag.findUnique({
    where: { id: tagId as string },
  });

  if (!tag) {
    console.warn('[AUTOMATION] Tag not found:', tagId);
    return;
  }

  // Connect tag to lead
  await prisma.lead.update({
    where: { id: event.leadId },
    data: {
      tags: {
        connect: { id: tagId as string },
      },
    },
  });
}

/**
 * Wait Action (for delays between actions)
 */
async function executeWaitAction(config: Record<string, unknown>): Promise<void> {
  const { duration } = config;
  const ms = Number(duration) || 1000;

  await new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Evaluate trigger conditions
 */
function evaluateConditions(
  conditions: Record<string, unknown>,
  eventData: Record<string, unknown>
): boolean {
  // Simple condition evaluation
  // Can be extended for more complex logic

  for (const [key, value] of Object.entries(conditions)) {
    if (eventData[key] !== value) {
      return false;
    }
  }

  return true;
}

/**
 * Helper functions to trigger automation from different events
 */

export async function triggerLeadCreated(leadId: string, userId: string): Promise<void> {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return;

  await processTrigger({
    type: 'LEAD_CREATED',
    data: { lead },
    leadId,
    userId,
  });
}

export async function triggerLeadStatusChanged(
  leadId: string,
  oldStatus: string,
  newStatus: string,
  userId: string
): Promise<void> {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return;

  await processTrigger({
    type: 'LEAD_STATUS_CHANGED',
    data: { lead, oldStatus, newStatus },
    leadId,
    userId,
  });
}

export async function triggerLeadAssigned(
  leadId: string,
  assignedToId: string,
  userId: string
): Promise<void> {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return;

  await processTrigger({
    type: 'LEAD_ASSIGNED',
    data: { lead, assignedToId },
    leadId,
    userId,
  });
}

export async function triggerEmailOpened(
  leadId: string,
  emailId: string
): Promise<void> {
  await processTrigger({
    type: 'EMAIL_OPENED',
    data: { emailId },
    leadId,
  });
}

export async function triggerScoreThreshold(
  leadId: string,
  score: number
): Promise<void> {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return;

  await processTrigger({
    type: 'SCORE_THRESHOLD',
    data: { lead, score },
    leadId,
  });
}
