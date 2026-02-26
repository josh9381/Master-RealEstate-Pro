import { prisma } from '../config/database';
import { WorkflowTrigger, ExecutionStatus } from '@prisma/client';
import { sendEmail } from './email.service';
import { sendSMS } from './sms.service';

/**
 * Workflow Service
 * 
 * Manages workflow automation including:
 * - Workflow CRUD operations
 * - Trigger management (lead events, campaign events, time-based, score thresholds)
 * - Condition evaluation (check if workflow should execute)
 * - Action execution (send email, update lead, create task, etc.)
 */

// ===================================
// Utility Helpers (migrated from workflow-executor.service.ts)
// ===================================

/**
 * Replace template variables with actual values
 * Supports: {{lead.name}}, {{lead.email}}, {{lead.firstName}}, etc.
 */
function replaceVariables(template: string | undefined, lead?: any, eventData?: any): string {
  if (!template) return '';
  let result = template;

  // Replace lead variables
  if (lead) {
    result = result.replace(/\{\{lead\.(\w+)\}\}/g, (_match, field) => {
      return lead[field] ?? _match;
    });
  }

  // Replace event data variables
  if (eventData) {
    result = result.replace(/\{\{(\w+)\}\}/g, (_match, field) => {
      const value = eventData[field];
      return value !== undefined ? String(value) : _match;
    });
  }

  return result;
}

/**
 * Parse due date string — supports relative dates like "+3 days", "+1 week"
 */
function parseDueDate(dueDateStr: string): Date {
  const relativeMatch = dueDateStr.match(/^\+(\d+)\s*(day|days|week|weeks|hour|hours)$/i);
  if (relativeMatch) {
    const amount = parseInt(relativeMatch[1], 10);
    const unit = relativeMatch[2].toLowerCase();
    const date = new Date();
    if (unit.startsWith('day')) date.setDate(date.getDate() + amount);
    else if (unit.startsWith('week')) date.setDate(date.getDate() + amount * 7);
    else if (unit.startsWith('hour')) date.setHours(date.getHours() + amount);
    return date;
  }
  return new Date(dueDateStr);
}

// ===================================
// Type Definitions
// ===================================

export interface WorkflowCondition {
  field: string;
  operator: 'equals' | 'notEquals' | 'contains' | 'notContains' | 'greaterThan' | 'lessThan' | 'greaterThanOrEqual' | 'lessThanOrEqual' | 'in' | 'notIn';
  value: any;
}

export interface WorkflowAction {
  type: 'SEND_EMAIL' | 'SEND_SMS' | 'UPDATE_LEAD' | 'ADD_TAG' | 'REMOVE_TAG' | 'CREATE_TASK' | 'ASSIGN_LEAD' | 'ADD_TO_CAMPAIGN' | 'UPDATE_SCORE' | 'SEND_NOTIFICATION' | 'WEBHOOK' | 'DELAY' | 'CONDITION';
  config: any;
}

export interface WorkflowTriggerData {
  // For LEAD_STATUS_CHANGED
  fromStatus?: string;
  toStatus?: string;
  
  // For SCORE_THRESHOLD
  scoreThreshold?: number;
  thresholdType?: 'above' | 'below' | 'equals';
  
  // For TIME_BASED
  schedule?: string; // Cron expression
  timezone?: string;
  
  // For TAG_ADDED
  tagName?: string;
  
  // For CAMPAIGN_COMPLETED
  campaignId?: string;
  
  // For EMAIL_OPENED
  campaignIds?: string[];
}

export interface CreateWorkflowInput {
  name: string;
  description?: string;
  isActive?: boolean;
  triggerType: WorkflowTrigger;
  triggerData?: WorkflowTriggerData;
  conditions?: WorkflowCondition[];
  actions: WorkflowAction[];
  organizationId: string;
}

export interface UpdateWorkflowInput {
  name?: string;
  description?: string;
  isActive?: boolean;
  triggerType?: WorkflowTrigger;
  triggerData?: WorkflowTriggerData;
  conditions?: WorkflowCondition[];
  actions?: WorkflowAction[];
}

// ===================================
// Workflow CRUD Operations
// ===================================

/**
 * Get all workflows with optional filtering
 */
export async function getWorkflows(filters?: {
  isActive?: boolean;
  triggerType?: WorkflowTrigger;
  search?: string;
}) {
  const where: any = {};

  if (filters?.isActive !== undefined) {
    where.isActive = filters.isActive;
  }

  if (filters?.triggerType) {
    where.triggerType = filters.triggerType;
  }

  if (filters?.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  const workflows = await prisma.workflow.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { workflowExecutions: true },
      },
    },
  });

  return workflows;
}

/**
 * Get a single workflow by ID
 */
export async function getWorkflowById(workflowId: string) {
  const workflow = await prisma.workflow.findUnique({
    where: { id: workflowId },
    include: {
      workflowExecutions: {
        orderBy: { startedAt: 'desc' },
        take: 10,
      },
    },
  });

  if (!workflow) {
    throw new Error('Workflow not found');
  }

  return workflow;
}

/**
 * Create a new workflow
 */
export async function createWorkflow(input: CreateWorkflowInput) {
  // Validate actions
  if (!input.actions || input.actions.length === 0) {
    throw new Error('Workflow must have at least one action');
  }

  const workflow = await prisma.workflow.create({
    data: {
      name: input.name,
      description: input.description,
      isActive: input.isActive ?? false,
      triggerType: input.triggerType,
      triggerData: (input.triggerData || {}) as any,
      actions: {
        conditions: input.conditions || [],
        actions: input.actions,
      } as any,
      organizationId: input.organizationId
    },
  });

  return workflow;
}

/**
 * Update an existing workflow
 */
export async function updateWorkflow(workflowId: string, input: UpdateWorkflowInput) {
  const existing = await prisma.workflow.findUnique({
    where: { id: workflowId },
  });

  if (!existing) {
    throw new Error('Workflow not found');
  }

  const currentActions = existing.actions as any;
  
  const workflow = await prisma.workflow.update({
    where: { id: workflowId },
    data: {
      name: input.name,
      description: input.description,
      isActive: input.isActive,
      triggerType: input.triggerType,
      triggerData: input.triggerData as any,
      actions: {
        conditions: input.conditions ?? currentActions.conditions ?? [],
        actions: input.actions ?? currentActions.actions ?? [],
      },
    },
  });

  return workflow;
}

/**
 * Delete a workflow
 */
export async function deleteWorkflow(workflowId: string) {
  await prisma.workflow.delete({
    where: { id: workflowId },
  });
}

/**
 * Toggle workflow active status
 */
export async function toggleWorkflowStatus(workflowId: string, isActive: boolean) {
  const workflow = await prisma.workflow.update({
    where: { id: workflowId },
    data: { isActive },
  });

  return workflow;
}

// ===================================
// Workflow Trigger Management
// ===================================

/**
 * Get workflows by trigger type
 */
export async function getWorkflowsByTrigger(triggerType: WorkflowTrigger) {
  const workflows = await prisma.workflow.findMany({
    where: {
      isActive: true,
      triggerType,
    },
  });

  return workflows;
}

/**
 * Trigger workflows based on lead events
 */
export async function triggerWorkflowsForLead(
  leadId: string,
  triggerType: WorkflowTrigger,
  metadata?: any
) {
  const workflows = await getWorkflowsByTrigger(triggerType);

  // Get lead data for condition evaluation
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      tags: true,
    },
  });

  if (!lead) {
    throw new Error('Lead not found');
  }

  const results = [];

  for (const workflow of workflows) {
    try {
      // Check trigger-specific conditions
      if (!shouldTriggerWorkflow(workflow, lead, metadata)) {
        continue;
      }

      // Evaluate workflow conditions
      const actionsConfig = workflow.actions as any;
      const conditions = actionsConfig.conditions || [];
      
      if (conditions.length > 0 && !evaluateConditions(conditions, lead)) {
        continue;
      }

      // Execute workflow
      const executionId = await executeWorkflow(workflow.id, leadId, metadata);
      results.push({ workflowId: workflow.id, executionId });
    } catch (error) {
      console.error(`Error executing workflow ${workflow.id}:`, error);
      results.push({
        workflowId: workflow.id,
        executionId: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return results;
}

/**
 * Check if workflow should trigger based on trigger data
 */
function shouldTriggerWorkflow(workflow: any, lead: any, metadata?: any): boolean {
  const triggerData = workflow.triggerData as WorkflowTriggerData;

  switch (workflow.triggerType) {
    case 'LEAD_STATUS_CHANGED':
      if (triggerData.fromStatus && metadata?.fromStatus !== triggerData.fromStatus) {
        return false;
      }
      if (triggerData.toStatus && metadata?.toStatus !== triggerData.toStatus) {
        return false;
      }
      return true;

    case 'SCORE_THRESHOLD':
      const score = lead.score || 0;
      const threshold = triggerData.scoreThreshold || 0;
      
      switch (triggerData.thresholdType) {
        case 'above':
          return score > threshold;
        case 'below':
          return score < threshold;
        case 'equals':
          return score === threshold;
        default:
          return false;
      }

    case 'TAG_ADDED':
      if (triggerData.tagName && metadata?.tagName !== triggerData.tagName) {
        return false;
      }
      return true;

    case 'CAMPAIGN_COMPLETED':
      if (triggerData.campaignId && metadata?.campaignId !== triggerData.campaignId) {
        return false;
      }
      return true;

    case 'EMAIL_OPENED':
      if (triggerData.campaignIds && triggerData.campaignIds.length > 0) {
        return triggerData.campaignIds.includes(metadata?.campaignId);
      }
      return true;

    default:
      return true;
  }
}

/**
 * Evaluate workflow conditions
 */
function evaluateConditions(conditions: WorkflowCondition[], lead: any): boolean {
  return conditions.every(condition => evaluateCondition(condition, lead));
}

/**
 * Evaluate a single condition
 */
function evaluateCondition(condition: WorkflowCondition, lead: any): boolean {
  const fieldValue = getNestedValue(lead, condition.field);

  switch (condition.operator) {
    case 'equals':
      return fieldValue === condition.value;
    case 'notEquals':
      return fieldValue !== condition.value;
    case 'contains':
      return typeof fieldValue === 'string' && fieldValue.includes(condition.value);
    case 'notContains':
      return typeof fieldValue === 'string' && !fieldValue.includes(condition.value);
    case 'greaterThan':
      return Number(fieldValue) > Number(condition.value);
    case 'lessThan':
      return Number(fieldValue) < Number(condition.value);
    case 'greaterThanOrEqual':
      return Number(fieldValue) >= Number(condition.value);
    case 'lessThanOrEqual':
      return Number(fieldValue) <= Number(condition.value);
    case 'in':
      return Array.isArray(condition.value) && condition.value.includes(fieldValue);
    case 'notIn':
      return Array.isArray(condition.value) && !condition.value.includes(fieldValue);
    default:
      return false;
  }
}

/**
 * Get nested object value by path (e.g., 'address.city')
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

// ===================================
// Workflow Execution
// ===================================

/**
 * Execute a workflow
 * @param dryRun - If true, validates actions without actually executing side effects
 */
export async function executeWorkflow(
  workflowId: string,
  leadId?: string,
  metadata?: any,
  dryRun: boolean = false
) {
  const workflow = await prisma.workflow.findUnique({
    where: { id: workflowId },
  });

  if (!workflow) {
    throw new Error('Workflow not found');
  }

  if (!workflow.isActive && !dryRun) {
    throw new Error('Workflow is not active');
  }

  // Create execution record
  const execution = await prisma.workflowExecution.create({
    data: {
      workflowId,
      leadId,
      status: ExecutionStatus.RUNNING,
      metadata: metadata || {},
    },
  });

  try {
    // Execute actions (supports sequential execution with delay and condition branching)
    const actionsConfig = workflow.actions as any;
    const actions = actionsConfig.actions || [];

    await executeActionSequence(actions, leadId, metadata, undefined, dryRun, execution.id);

    // Update execution as successful
    await prisma.workflowExecution.update({
      where: { id: execution.id },
      data: {
        status: ExecutionStatus.SUCCESS,
        completedAt: new Date(),
      },
    });

    // Update workflow stats
    await updateWorkflowStats(workflowId, true);

    return execution.id;
  } catch (error) {
    // Update execution as failed
    await prisma.workflowExecution.update({
      where: { id: execution.id },
      data: {
        status: ExecutionStatus.FAILED,
        error: error instanceof Error ? error.message : 'Unknown error',
        completedAt: new Date(),
      },
    });

    // Update workflow stats
    await updateWorkflowStats(workflowId, false);

    throw error;
  }
}

/**
 * Execute a sequence of workflow actions, handling DELAY and CONDITION types
 */
async function executeActionSequence(
  actions: WorkflowAction[],
  leadId?: string,
  metadata?: any,
  organizationId?: string,
  dryRun: boolean = false,
  executionId?: string
): Promise<void> {
  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];

    if (action.type === 'DELAY') {
      // Calculate delay duration in milliseconds
      const delayMs = calculateDelayMs(action.config);
      
      if (dryRun) {
        console.log(`[DRY RUN] Would delay for ${delayMs}ms`);
        continue;
      }
      
      console.log(`[Workflow] Scheduling remaining ${actions.length - i - 1} actions after ${delayMs}ms delay`);
      
      // Schedule remaining actions for later execution
      const remainingActions = actions.slice(i + 1);
      if (remainingActions.length > 0) {
        scheduleDelayedActions(remainingActions, delayMs, leadId, metadata, organizationId, executionId);
      }
      return; // Stop current execution - remaining actions will run after delay
    }

    if (action.type === 'CONDITION') {
      // Evaluate condition and branch
      const conditionMet = await evaluateActionCondition(action.config, leadId);
      
      if (dryRun) {
        console.log(`[DRY RUN] Condition evaluated: ${conditionMet}`);
        continue;
      }
      
      console.log(`[Workflow] Condition evaluated: ${conditionMet}`);
      
      if (conditionMet) {
        // Execute "true" branch actions if defined
        const trueBranch = action.config.trueBranch || [];
        if (trueBranch.length > 0) {
          await executeActionSequence(trueBranch, leadId, metadata, organizationId, dryRun, executionId);
        }
      } else {
        // Execute "false" branch actions if defined
        const falseBranch = action.config.falseBranch || [];
        if (falseBranch.length > 0) {
          await executeActionSequence(falseBranch, leadId, metadata, organizationId, dryRun, executionId);
        }
      }
      continue;
    }

    // Per-action retry: attempt up to 3 times with exponential backoff
    const MAX_RETRIES = 3;
    const RETRY_DELAYS = [1000, 3000, 9000]; // 1s, 3s, 9s
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        await executeAction(action, leadId, metadata, organizationId, dryRun);
        lastError = undefined;
        break; // Success — move to next action
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.warn(
          `[Workflow] Action ${action.type} attempt ${attempt + 1}/${MAX_RETRIES} failed: ${lastError.message}`
        );
        if (attempt < MAX_RETRIES - 1) {
          await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt]));
        }
      }
    }

    if (lastError) {
      console.error(
        `[Workflow] Action ${action.type} failed after ${MAX_RETRIES} retries – skipping and continuing sequence`
      );
      // Continue with next action instead of aborting the whole sequence
    }
  }
}

/**
 * Calculate delay duration in milliseconds from config
 */
function calculateDelayMs(config: any): number {
  const amount = parseInt(config.duration || config.amount || '1', 10);
  const unit = (config.unit || 'hours').toLowerCase();
  
  switch (unit) {
    case 'minutes': return amount * 60 * 1000;
    case 'hours': return amount * 60 * 60 * 1000;
    case 'days': return amount * 24 * 60 * 60 * 1000;
    case 'weeks': return amount * 7 * 24 * 60 * 60 * 1000;
    default: return amount * 60 * 60 * 1000; // Default to hours
  }
}

/**
 * Schedule delayed actions using setTimeout and persist to database for recovery
 */
function scheduleDelayedActions(
  actions: WorkflowAction[],
  delayMs: number,
  leadId?: string,
  metadata?: any,
  organizationId?: string,
  executionId?: string
): void {
  // Cap delay to prevent overflow (max ~24 days with setTimeout)
  const cappedDelay = Math.min(delayMs, 2147483647);
  
  // Store the scheduled job info in the execution metadata for recovery
  if (executionId) {
    prisma.workflowExecution.update({
      where: { id: executionId },
      data: {
        metadata: {
          ...(metadata || {}),
          scheduledActions: actions,
          scheduledAt: new Date().toISOString(),
          scheduledFor: new Date(Date.now() + cappedDelay).toISOString(),
        } as any,
      },
    }).catch(err => {
      // This is a fire-and-forget persistence write for recovery data.
      // Log with execution ID so it can be investigated if delayed actions fail.
      console.error(`[Workflow] Failed to save scheduled actions for execution ${executionId}:`, err);
    });
  }

  setTimeout(async () => {
    try {
      console.log(`[Workflow] Executing ${actions.length} delayed actions`);
      await executeActionSequence(actions, leadId, metadata, organizationId, false, executionId);
    } catch (error) {
      console.error('[Workflow] Failed to execute delayed actions:', error);
    }
  }, cappedDelay);
}

/**
 * Evaluate a condition against lead data for conditional branching
 */
async function evaluateActionCondition(config: any, leadId?: string): Promise<boolean> {
  if (!leadId) return false;

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { tags: true },
  });

  if (!lead) return false;

  const conditions = config.conditions || [];
  
  if (conditions.length === 0) {
    // Simple field check
    const field = config.field;
    const operator = config.operator || 'equals';
    const value = config.value;
    return evaluateCondition({ field, operator, value }, lead);
  }

  // Multiple conditions with AND/OR logic
  const matchType = config.matchType || 'all';
  if (matchType === 'all') {
    return conditions.every((c: WorkflowCondition) => evaluateCondition(c, lead));
  } else {
    return conditions.some((c: WorkflowCondition) => evaluateCondition(c, lead));
  }
}

/**
 * Execute a single workflow action
 * @param dryRun - If true, validates the action config but does not execute side effects
 */
async function executeAction(action: WorkflowAction, leadId?: string, metadata?: any, organizationId?: string, dryRun: boolean = false) {
  // In dry-run mode, validate action config then return without side effects
  if (dryRun) {
    const requiresLead: WorkflowAction['type'][] = ['UPDATE_LEAD', 'ADD_TAG', 'REMOVE_TAG', 'UPDATE_SCORE', 'CREATE_TASK', 'ASSIGN_LEAD', 'ADD_TO_CAMPAIGN', 'SEND_EMAIL', 'SEND_SMS'];
    if (requiresLead.includes(action.type) && !leadId) {
      console.log(`[DRY RUN] Action ${action.type} would require a lead ID`);
    }
    if (!action.config) {
      throw new Error(`Action ${action.type} is missing config`);
    }
    console.log(`[DRY RUN] Validated action: ${action.type}`);
    return;
  }

  switch (action.type) {
    case 'UPDATE_LEAD':
      if (!leadId) throw new Error('Lead ID required for UPDATE_LEAD action');
      await prisma.lead.update({
        where: { id: leadId },
        data: action.config.updates,
      });
      break;

    case 'ADD_TAG':
      if (!leadId) throw new Error('Lead ID required for ADD_TAG action');
      
      // Get lead's organizationId if not provided
      let orgId = organizationId;
      if (!orgId) {
        const lead = await prisma.lead.findUnique({
          where: { id: leadId },
          select: { organizationId: true }
        });
        orgId = lead?.organizationId;
      }
      
      if (!orgId) throw new Error('Organization ID not found');
      
      const existingTag = await prisma.tag.findFirst({
        where: {
          organizationId: orgId,
          name: action.config.tagName,
        },
      });

      if (existingTag) {
        await prisma.lead.update({
          where: { id: leadId },
          data: {
            tags: {
              connect: { id: existingTag.id },
            },
          },
        });
      } else {
        await prisma.lead.update({
          where: { id: leadId },
          data: {
            tags: {
              create: {
                name: action.config.tagName,
                color: action.config.tagColor || '#3B82F6',
                organizationId: orgId
              },
            },
          },
        });
      }
      break;

    case 'REMOVE_TAG':
      if (!leadId) throw new Error('Lead ID required for REMOVE_TAG action');
      const tagToRemove = await prisma.tag.findFirst({
        where: {
          name: action.config.tagName,
        },
      });

      if (tagToRemove) {
        await prisma.lead.update({
          where: { id: leadId },
          data: {
            tags: {
              disconnect: { id: tagToRemove.id },
            },
          },
        });
      }
      break;

    case 'UPDATE_SCORE':
      if (!leadId) throw new Error('Lead ID required for UPDATE_SCORE action');
      const lead = await prisma.lead.findUnique({ where: { id: leadId } });
      if (lead) {
        const currentScore = lead.score || 0;
        const scoreChange = action.config.scoreChange || 0;
        const newScore = Math.max(0, Math.min(100, currentScore + scoreChange));
        
        await prisma.lead.update({
          where: { id: leadId },
          data: { score: newScore },
        });
      }
      break;

    case 'CREATE_TASK':
      if (!leadId) throw new Error('Lead ID required for CREATE_TASK action');
      // Get organizationId from lead if not provided
      let taskOrgId = organizationId;
      if (!taskOrgId) {
        const taskLead = await prisma.lead.findUnique({
          where: { id: leadId },
          select: { organizationId: true }
        });
        taskOrgId = taskLead?.organizationId;
      }
      if (!taskOrgId) throw new Error('Organization ID not found for task creation');
      await prisma.task.create({
        data: {
          title: action.config.title,
          description: action.config.description,
          dueDate: action.config.dueDate ? parseDueDate(action.config.dueDate) : undefined,
          priority: action.config.priority || 'MEDIUM',
          leadId,
          assignedToId: action.config.assignedToId,
          organizationId: taskOrgId,
        },
      });
      break;

    case 'ASSIGN_LEAD':
      if (!leadId) throw new Error('Lead ID required for ASSIGN_LEAD action');
      await prisma.lead.update({
        where: { id: leadId },
        data: {
          assignedToId: action.config.userId,
        },
      });
      break;

    case 'ADD_TO_CAMPAIGN':
      if (!leadId) throw new Error('Lead ID required for ADD_TO_CAMPAIGN action');
      // This would require campaign recipient management
      // For now, just log the action
      console.log(`Adding lead ${leadId} to campaign ${action.config.campaignId}`);
      break;

    case 'SEND_EMAIL':
      if (!leadId) throw new Error('Lead ID required for SEND_EMAIL action');
      // Fetch lead details for email sending
      const emailLead = await prisma.lead.findUnique({
        where: { id: leadId },
        select: { email: true, firstName: true, lastName: true, organizationId: true, assignedToId: true }
      });
      if (!emailLead?.email) {
        console.warn(`[Workflow] Lead ${leadId} has no email address, skipping SEND_EMAIL`);
        break;
      }
      const emailOrgId = organizationId || emailLead.organizationId;
      if (!emailOrgId) throw new Error('Organization ID not found for SEND_EMAIL action');
      await sendEmail({
        to: emailLead.email,
        subject: replaceVariables(action.config.subject || 'Notification', emailLead, metadata),
        html: replaceVariables(action.config.body || action.config.html || action.config.content || '', emailLead, metadata),
        text: action.config.text ? replaceVariables(action.config.text, emailLead, metadata) : undefined,
        leadId,
        userId: emailLead.assignedToId || undefined,
        organizationId: emailOrgId,
      });
      console.log(`[Workflow] Email sent to lead ${leadId} (${emailLead.email})`);
      break;

    case 'SEND_SMS':
      if (!leadId) throw new Error('Lead ID required for SEND_SMS action');
      // Fetch lead details for SMS sending
      const smsLead = await prisma.lead.findUnique({
        where: { id: leadId },
        select: { phone: true, firstName: true, lastName: true, organizationId: true, assignedToId: true }
      });
      if (!smsLead?.phone) {
        console.warn(`[Workflow] Lead ${leadId} has no phone number, skipping SEND_SMS`);
        break;
      }
      const smsOrgId = organizationId || smsLead.organizationId;
      if (!smsOrgId) throw new Error('Organization ID not found for SEND_SMS action');
      await sendSMS({
        to: smsLead.phone,
        message: replaceVariables(action.config.message || action.config.body || action.config.content || '', smsLead, metadata),
        leadId,
        userId: smsLead.assignedToId || undefined,
        organizationId: smsOrgId,
      });
      console.log(`[Workflow] SMS sent to lead ${leadId} (${smsLead.phone})`);
      break;

    case 'SEND_NOTIFICATION':
      // This would integrate with notification service
      console.log('Sending notification:', action.config);
      break;

    case 'WEBHOOK':
      // This would make HTTP request to webhook URL
      console.log('Calling webhook:', action.config.url);
      break;

    default:
      console.warn(`Unknown action type: ${action.type}`);
  }
}

/**
 * Update workflow execution statistics
 */
async function updateWorkflowStats(workflowId: string, success: boolean) {
  const workflow = await prisma.workflow.findUnique({
    where: { id: workflowId },
    include: {
      workflowExecutions: {
        where: {
          completedAt: { not: null },
        },
      },
    },
  });

  if (!workflow) return;

  const totalExecutions = workflow.workflowExecutions.length;
  const successfulExecutions = workflow.workflowExecutions.filter(
    ex => ex.status === ExecutionStatus.SUCCESS
  ).length;

  await prisma.workflow.update({
    where: { id: workflowId },
    data: {
      executions: totalExecutions,
      successRate: totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : null,
      lastRunAt: new Date(),
    },
  });
}

// ===================================
// Workflow Analytics
// ===================================

/**
 * Get workflow execution history
 */
export async function getWorkflowExecutions(
  workflowId: string,
  options?: {
    status?: ExecutionStatus;
    limit?: number;
    offset?: number;
  }
) {
  const where: any = { workflowId };

  if (options?.status) {
    where.status = options.status;
  }

  const executions = await prisma.workflowExecution.findMany({
    where,
    orderBy: { startedAt: 'desc' },
    take: options?.limit || 50,
    skip: options?.offset || 0,
    include: {
      workflow: {
        select: {
          name: true,
        },
      },
    },
  });

  return executions;
}

/**
 * Get workflow analytics
 */
export async function getWorkflowAnalytics(workflowId: string, days: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const executions = await prisma.workflowExecution.findMany({
    where: {
      workflowId,
      startedAt: { gte: startDate },
    },
    orderBy: { startedAt: 'asc' },
  });

  // Group by day
  const dailyStats: { [key: string]: { total: number; success: number; failed: number } } = {};

  executions.forEach(exec => {
    const date = exec.startedAt.toISOString().split('T')[0];
    if (!dailyStats[date]) {
      dailyStats[date] = { total: 0, success: 0, failed: 0 };
    }
    dailyStats[date].total++;
    if (exec.status === ExecutionStatus.SUCCESS) {
      dailyStats[date].success++;
    } else if (exec.status === ExecutionStatus.FAILED) {
      dailyStats[date].failed++;
    }
  });

  return {
    totalExecutions: executions.length,
    successfulExecutions: executions.filter(e => e.status === ExecutionStatus.SUCCESS).length,
    failedExecutions: executions.filter(e => e.status === ExecutionStatus.FAILED).length,
    successRate: executions.length > 0
      ? (executions.filter(e => e.status === ExecutionStatus.SUCCESS).length / executions.length) * 100
      : 0,
    dailyStats: Object.entries(dailyStats).map(([date, stats]) => ({
      date,
      ...stats,
    })),
  };
}

/**
 * Manually trigger a workflow
 */
export async function manualTriggerWorkflow(workflowId: string, leadId?: string) {
  return executeWorkflow(workflowId, leadId, { trigger: 'manual' });
}
