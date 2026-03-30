import { logger } from '../lib/logger'
import { prisma } from '../config/database';
import { WorkflowTrigger, ExecutionStatus } from '@prisma/client';
import { sendEmail } from './email.service';
import { sendSMS } from './sms.service';
import { pushWorkflowEvent, pushNotification } from '../config/socket';
import crypto from 'crypto';
import { calcRate } from '../utils/metricsCalculator';
import { getSegmentMembers } from './segmentation.service';

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

  // Replace lead variables — escape the replacement value so it can't inject new template vars
  if (lead) {
    result = result.replace(/\{\{lead\.(\w+)\}\}/g, (_match, field) => {
      const value = lead[field];
      if (value === undefined || value === null) return _match;
      // Sanitize: remove {{ and }} from user data to prevent template injection
      return String(value).replace(/\{\{/g, '{ {').replace(/\}\}/g, '} }');
    });
  }

  // Replace event data variables
  if (eventData) {
    result = result.replace(/\{\{(\w+)\}\}/g, (_match, field) => {
      const value = eventData[field];
      if (value === undefined) return _match;
      // Sanitize: remove {{ and }} from event data values
      return String(value).replace(/\{\{/g, '{ {').replace(/\}\}/g, '} }');
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
      organizationId: input.organizationId,
      // Auto-generate a webhook key for WEBHOOK trigger workflows
      ...(input.triggerType === 'WEBHOOK' ? {
        webhookKey: crypto.randomBytes(24).toString('hex'),
      } : {}),
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
export async function getWorkflowsByTrigger(triggerType: WorkflowTrigger, organizationId?: string) {
  const where: Record<string, unknown> = {
    isActive: true,
    triggerType,
  };
  if (organizationId) {
    where.organizationId = organizationId;
  }

  const workflows = await prisma.workflow.findMany({ where });

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

  // Scope to lead's organization to prevent cross-tenant workflow execution
  const workflows = await getWorkflowsByTrigger(triggerType, lead.organizationId);

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
      
      if (conditions.length > 0 && !(await evaluateConditions(conditions, lead))) {
        continue;
      }

      // Execute workflow
      const executionId = await executeWorkflow(workflow.id, leadId, metadata);
      results.push({ workflowId: workflow.id, executionId });
    } catch (error) {
      logger.error(`Error executing workflow ${workflow.id}:`, error);
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
async function evaluateConditions(conditions: WorkflowCondition[], lead: any): Promise<boolean> {
  for (const condition of conditions) {
    const result = await evaluateConditionAsync(condition, lead);
    if (!result) return false;
  }
  return true;
}

/**
 * Evaluate a single condition (async to support SEGMENT_MATCH)
 */
async function evaluateConditionAsync(condition: WorkflowCondition, lead: any): Promise<boolean> {
  // Special handling for SEGMENT_MATCH — check if lead is in a segment
  if (condition.field === 'SEGMENT_MATCH' && condition.value) {
    try {
      const orgId = lead.organizationId;
      if (!orgId) return false;
      const result = await getSegmentMembers(condition.value, orgId, { page: 1, limit: 1 });
      // Check if this specific lead is in the segment
      const leadInSegment = result.leads.some((m: any) => m.id === lead.id);
      if (result.leads.length === 0 && result.total > 0) {
        // Fallback: count matching leads with this lead's ID
        const count = await prisma.lead.count({
          where: { id: lead.id, organizationId: orgId },
        });
        return count > 0;
      }
      return leadInSegment;
    } catch {
      return false;
    }
  }

  return evaluateCondition(condition, lead);
}

/**
 * Evaluate a single condition (sync — for non-segment conditions)
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

    await executeActionSequence(actions, leadId, metadata, workflow.organizationId, dryRun, execution.id, undefined, {
      maxRetries: workflow.maxRetries ?? 3,
      notifyOnFailure: workflow.notifyOnFailure ?? true,
      workflowId,
      workflowName: workflow.name,
    });

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

    // Push real-time workflow event
    if (workflow.organizationId) {
      pushWorkflowEvent(workflow.organizationId, {
        workflowId,
        workflowName: workflow.name,
        action: 'completed',
        leadId: leadId || undefined,
      });
    }

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
 * Log a workflow execution step to the database
 */
async function logExecutionStep(data: {
  executionId: string;
  stepIndex: number;
  actionType: string;
  actionLabel?: string;
  actionConfig?: any;
  status: ExecutionStatus;
  error?: string;
  retryCount?: number;
  startedAt: Date;
  completedAt?: Date;
  durationMs?: number;
  branchTaken?: string;
  output?: any;
}): Promise<void> {
  try {
    await prisma.workflowExecutionStep.create({
      data: {
        executionId: data.executionId,
        stepIndex: data.stepIndex,
        actionType: data.actionType,
        actionLabel: data.actionLabel || null,
        actionConfig: data.actionConfig || undefined,
        status: data.status,
        error: data.error || null,
        retryCount: data.retryCount || 0,
        startedAt: data.startedAt,
        completedAt: data.completedAt || null,
        durationMs: data.durationMs || null,
        branchTaken: data.branchTaken || null,
        output: data.output || undefined,
      },
    });
  } catch (err) {
    // Never let step-logging break the workflow
    logger.error('[Workflow] Failed to log execution step:', err);
  }
}

/**
 * Notify organization users when a workflow action fails after all retries.
 * Creates a persistent Notification record + pushes real-time socket event.
 */
async function notifyWorkflowFailure(params: {
  organizationId: string;
  workflowId: string;
  workflowName: string;
  actionType: string;
  actionLabel: string;
  error: string;
  retries: number;
  leadId?: string;
  executionId?: string;
}): Promise<void> {
  try {
    // Find org users to notify (admins + the workflow's org members)
    const orgUsers = await prisma.user.findMany({
      where: { organizationId: params.organizationId },
      select: { id: true },
    });

    const title = `Workflow "${params.workflowName}" — step failed`;
    const message = `Action "${params.actionLabel}" (${params.actionType}) failed after ${params.retries} ${params.retries === 1 ? 'attempt' : 'attempts'}: ${params.error}`;
    const link = `/workflows/builder?id=${params.workflowId}`;

    for (const user of orgUsers) {
      const notification = await prisma.notification.create({
        data: {
          userId: user.id,
          organizationId: params.organizationId,
          type: 'WORKFLOW',
          title,
          message,
          link,
          read: false,
        },
      });

      // Push real-time notification
      pushNotification(user.id, {
        id: notification.id,
        type: 'WORKFLOW',
        title,
        message,
        read: false,
        createdAt: notification.createdAt.toISOString(),
        data: {
          workflowId: params.workflowId,
          executionId: params.executionId,
          actionType: params.actionType,
        },
      });
    }

    logger.info(`[Workflow] Failure notification sent to ${orgUsers.length} user(s) for workflow ${params.workflowId}`);
  } catch (err) {
    // Never let notification failures break the workflow
    logger.error('[Workflow] Failed to send failure notification:', err);
  }
}

/** Mutable counter passed through recursive calls */
interface StepCounter {
  value: number;
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
  executionId?: string,
  stepCounter?: StepCounter,
  retryConfig?: {
    maxRetries: number;
    notifyOnFailure: boolean;
    workflowId: string;
    workflowName: string;
  }
): Promise<void> {
  const counter = stepCounter || { value: 0 };
  const maxRetries = Math.min(Math.max(retryConfig?.maxRetries ?? 3, 1), 3);

  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    const stepIdx = counter.value++;
    const stepStart = new Date();

    if (action.type === 'DELAY') {
      // Calculate delay duration in milliseconds
      const delayMs = calculateDelayMs(action.config);
      
      if (dryRun) {
        logger.info(`[DRY RUN] Would delay for ${delayMs}ms`);
        continue;
      }
      
      logger.info(`[Workflow] Scheduling remaining ${actions.length - i - 1} actions after ${delayMs}ms delay`);

      // Log the delay step
      if (executionId) {
        await logExecutionStep({
          executionId,
          stepIndex: stepIdx,
          actionType: 'DELAY',
          actionLabel: (action as any).label || 'Delay',
          actionConfig: action.config,
          status: ExecutionStatus.SUCCESS,
          startedAt: stepStart,
          completedAt: new Date(),
          durationMs: Date.now() - stepStart.getTime(),
          output: { delayMs, remainingActions: actions.length - i - 1 },
        });
      }
      
      // Schedule remaining actions for later execution
      const remainingActions = actions.slice(i + 1);
      if (remainingActions.length > 0) {
        await scheduleDelayedActions(remainingActions, delayMs, leadId, metadata, organizationId, executionId);
      }
      return; // Stop current execution - remaining actions will run after delay
    }

    if (action.type === 'CONDITION') {
      // Evaluate condition and branch
      const conditionMet = await evaluateActionCondition(action.config, leadId);
      
      if (dryRun) {
        logger.info(`[DRY RUN] Condition evaluated: ${conditionMet}`);
        continue;
      }
      
      logger.info(`[Workflow] Condition evaluated: ${conditionMet}`);

      // Log the condition step
      if (executionId) {
        await logExecutionStep({
          executionId,
          stepIndex: stepIdx,
          actionType: 'CONDITION',
          actionLabel: (action as any).label || 'Condition',
          actionConfig: action.config,
          status: ExecutionStatus.SUCCESS,
          startedAt: stepStart,
          completedAt: new Date(),
          durationMs: Date.now() - stepStart.getTime(),
          branchTaken: conditionMet ? 'true' : 'false',
          output: { conditionResult: conditionMet },
        });
      }
      
      if (conditionMet) {
        // Execute "true" branch actions if defined
        const trueBranch = action.config.trueBranch || [];
        if (trueBranch.length > 0) {
          await executeActionSequence(trueBranch, leadId, metadata, organizationId, dryRun, executionId, counter, retryConfig);
        }
      } else {
        // Execute "false" branch actions if defined
        const falseBranch = action.config.falseBranch || [];
        if (falseBranch.length > 0) {
          await executeActionSequence(falseBranch, leadId, metadata, organizationId, dryRun, executionId, counter, retryConfig);
        }
      }
      continue;
    }

    // Per-action retry: configurable retries (1-3) with exponential backoff
    const RETRY_DELAYS = [1000, 3000, 9000]; // 1s, 3s, 9s
    let lastError: Error | undefined;
    let attempts = 0;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      attempts = attempt + 1;
      try {
        await executeAction(action, leadId, metadata, organizationId, dryRun);
        lastError = undefined;
        break; // Success — move to next action
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        logger.warn(
          `[Workflow] Action ${action.type} attempt ${attempt + 1}/${maxRetries} failed: ${lastError.message}`
        );
        if (attempt < maxRetries - 1) {
          await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt]));
        }
      }
    }

    // Log action step result
    if (executionId) {
      const stepEnd = new Date();
      await logExecutionStep({
        executionId,
        stepIndex: stepIdx,
        actionType: action.type,
        actionLabel: (action as any).label || action.type,
        actionConfig: action.config,
        status: lastError ? ExecutionStatus.FAILED : ExecutionStatus.SUCCESS,
        error: lastError?.message,
        retryCount: attempts - 1,
        startedAt: stepStart,
        completedAt: stepEnd,
        durationMs: stepEnd.getTime() - stepStart.getTime(),
      });
    }

    if (lastError) {
      logger.error(
        `[Workflow] Action ${action.type} failed after ${maxRetries} retries – notifying user and continuing`
      );

      // Notify the user about the failure
      if (retryConfig?.notifyOnFailure && organizationId) {
        await notifyWorkflowFailure({
          organizationId,
          workflowId: retryConfig.workflowId,
          workflowName: retryConfig.workflowName,
          actionType: action.type,
          actionLabel: (action as any).label || action.type,
          error: lastError.message,
          retries: maxRetries,
          leadId,
          executionId,
        });
      }
      // Continue with next action instead of aborting the whole sequence
    }
  }
}

/**
 * Calculate delay duration in milliseconds from config.
 * Supports two modes:
 *  - Relative: { duration, unit } — wait for N minutes/hours/days/weeks
 *  - Absolute: { scheduledFor } — wait until a specific date/time
 */
function calculateDelayMs(config: any): number {
  // Absolute "wait until" mode
  if (config.scheduledFor) {
    const target = new Date(config.scheduledFor).getTime();
    const now = Date.now();
    return Math.max(0, target - now);
  }

  // Relative "wait for" mode
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
async function scheduleDelayedActions(
  actions: WorkflowAction[],
  delayMs: number,
  leadId?: string,
  metadata?: any,
  organizationId?: string,
  executionId?: string
): Promise<void> {
  // Cap delay to prevent overflow (max ~24 days with setTimeout)
  const cappedDelay = Math.min(delayMs, 2147483647);
  
  // Store the scheduled job info in the execution metadata for recovery
  if (executionId) {
    // Use await (not fire-and-forget) to ensure recovery data is persisted
    // before scheduling the setTimeout. If persistence fails, retry once.
    const persistData = {
      ...(metadata || {}),
      scheduledActions: actions,
      scheduledAt: new Date().toISOString(),
      scheduledFor: new Date(Date.now() + cappedDelay).toISOString(),
    };
    
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await prisma.workflowExecution.update({
          where: { id: executionId },
          data: { metadata: persistData as any },
        });
        break; // Success
      } catch (err) {
        if (attempt === 0) {
          logger.warn(`[Workflow] Delay persistence attempt 1 failed for ${executionId}, retrying...`);
          await new Promise(r => setTimeout(r, 500));
        } else {
          logger.error(`[Workflow] Failed to persist scheduled actions for execution ${executionId} after 2 attempts. Delay may be lost on restart.`, err);
        }
      }
    }
  }

  setTimeout(async () => {
    try {
      logger.info(`[Workflow] Executing ${actions.length} delayed actions`);
      await executeActionSequence(actions, leadId, metadata, organizationId, false, executionId);
    } catch (error) {
      logger.error('[Workflow] Failed to execute delayed actions:', error);
    }
  }, cappedDelay);
}

/**
 * Evaluate a condition against lead data for conditional branching.
 * Supports four condition types:
 *  - lead_field (default): Check a lead property
 *  - email_opened: Check if the lead opened any email (optionally within N hours)
 *  - link_clicked: Check if the lead clicked any link (optionally within N hours)
 *  - time_elapsed: Check if N hours/days have passed since a reference event
 */
async function evaluateActionCondition(config: any, leadId?: string): Promise<boolean> {
  if (!leadId) return false;

  const conditionType = config.conditionType || 'lead_field';

  // ---------- EMAIL OPENED ----------
  if (conditionType === 'email_opened') {
    const withinHours = config.withinHours ? Number(config.withinHours) : null;
    const where: any = {
      leadId,
      readAt: { not: null },
    };
    if (withinHours) {
      where.readAt = { gte: new Date(Date.now() - withinHours * 60 * 60 * 1000) };
    }
    const count = await prisma.message.count({ where });
    return count > 0;
  }

  // ---------- LINK CLICKED ----------
  if (conditionType === 'link_clicked') {
    const withinHours = config.withinHours ? Number(config.withinHours) : null;
    // Check for CLICKED status messages
    const where: any = {
      leadId,
      status: 'CLICKED',
    };
    if (withinHours) {
      where.updatedAt = { gte: new Date(Date.now() - withinHours * 60 * 60 * 1000) };
    }
    const count = await prisma.message.count({ where });
    return count > 0;
  }

  // ---------- TIME ELAPSED ----------
  if (conditionType === 'time_elapsed') {
    const amount = Number(config.elapsedAmount || 0);
    const unit = config.elapsedUnit || 'hours';
    const sinceEvent = config.sinceEvent || 'workflow_start';

    let referenceTime: Date | null = null;

    if (sinceEvent === 'workflow_start') {
      // Use the current execution's startedAt or fall back to now
      // The metadata may carry workflowStartedAt from the executor
      referenceTime = config._workflowStartedAt ? new Date(config._workflowStartedAt) : null;
    } else if (sinceEvent === 'lead_created') {
      const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { createdAt: true } });
      referenceTime = lead?.createdAt || null;
    } else if (sinceEvent === 'last_activity') {
      const lastActivity = await prisma.activity.findFirst({
        where: { leadId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      });
      referenceTime = lastActivity?.createdAt || null;
    }

    if (!referenceTime) return false;

    let elapsedMs = Date.now() - referenceTime.getTime();
    let thresholdMs: number;
    switch (unit) {
      case 'minutes': thresholdMs = amount * 60 * 1000; break;
      case 'hours': thresholdMs = amount * 60 * 60 * 1000; break;
      case 'days': thresholdMs = amount * 24 * 60 * 60 * 1000; break;
      default: thresholdMs = amount * 60 * 60 * 1000;
    }

    return elapsedMs >= thresholdMs;
  }

  // ---------- LEAD FIELD (default) ----------

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
    return evaluateConditionAsync({ field, operator, value }, lead);
  }

  // Multiple conditions with AND/OR logic
  const matchType = config.matchType || 'ALL';
  if (matchType === 'ALL') {
    return evaluateConditions(conditions, lead);
  } else {
    for (const c of conditions as WorkflowCondition[]) {
      if (await evaluateConditionAsync(c, lead)) return true;
    }
    return false;
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
      logger.info(`[DRY RUN] Action ${action.type} would require a lead ID`);
    }
    if (!action.config) {
      throw new Error(`Action ${action.type} is missing config`);
    }
    logger.info(`[DRY RUN] Validated action: ${action.type}`);
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

    case 'REMOVE_TAG': {
      if (!leadId) throw new Error('Lead ID required for REMOVE_TAG action');
      // Scope tag lookup to organization to prevent cross-tenant matches
      let removeTagOrgId = organizationId;
      if (!removeTagOrgId) {
        const removeTagLead = await prisma.lead.findUnique({
          where: { id: leadId },
          select: { organizationId: true }
        });
        removeTagOrgId = removeTagLead?.organizationId;
      }
      const tagToRemove = await prisma.tag.findFirst({
        where: {
          name: action.config.tagName,
          ...(removeTagOrgId ? { organizationId: removeTagOrgId } : {}),
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
    }

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
      if (!action.config.campaignId) {
        logger.warn('[Workflow] No campaignId configured for ADD_TO_CAMPAIGN action, skipping');
        break;
      }
      // Add lead to campaign via CampaignLead model
      const campaignLead = await prisma.lead.findUnique({
        where: { id: leadId },
        select: { organizationId: true },
      });
      if (!campaignLead) {
        logger.warn(`[Workflow] Lead ${leadId} not found for ADD_TO_CAMPAIGN`);
        break;
      }
      await prisma.campaignLead.upsert({
        where: {
          campaignId_leadId: {
            campaignId: action.config.campaignId as string,
            leadId: leadId,
          },
        },
        create: {
          campaignId: action.config.campaignId as string,
          leadId: leadId,
          organizationId: campaignLead.organizationId,
          status: 'PENDING',
        },
        update: {},
      });
      logger.info(`[Workflow] Added lead ${leadId} to campaign ${action.config.campaignId}`);
      break;

    case 'SEND_EMAIL':
      if (!leadId) throw new Error('Lead ID required for SEND_EMAIL action');
      // Fetch lead details for email sending
      const emailLead = await prisma.lead.findUnique({
        where: { id: leadId },
        select: { email: true, firstName: true, lastName: true, organizationId: true, assignedToId: true }
      });
      if (!emailLead?.email) {
        logger.warn(`[Workflow] Lead ${leadId} has no email address, skipping SEND_EMAIL`);
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
      logger.info(`[Workflow] Email sent to lead ${leadId} (${emailLead.email})`);
      break;

    case 'SEND_SMS':
      if (!leadId) throw new Error('Lead ID required for SEND_SMS action');
      // Fetch lead details for SMS sending
      const smsLead = await prisma.lead.findUnique({
        where: { id: leadId },
        select: { phone: true, firstName: true, lastName: true, organizationId: true, assignedToId: true }
      });
      if (!smsLead?.phone) {
        logger.warn(`[Workflow] Lead ${leadId} has no phone number, skipping SEND_SMS`);
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
      logger.info(`[Workflow] SMS sent to lead ${leadId} (${smsLead.phone})`);
      break;

    case 'SEND_NOTIFICATION':
      if (!leadId) {
        logger.warn('[Workflow] No leadId for SEND_NOTIFICATION, skipping');
        break;
      }
      // Send an in-app notification via the notification table
      const notifLead = await prisma.lead.findUnique({
        where: { id: leadId },
        select: { firstName: true, lastName: true, assignedToId: true, organizationId: true }
      });
      if (notifLead?.assignedToId) {
        const notifOrgId = organizationId || notifLead.organizationId;
        await prisma.notification.create({
          data: {
            userId: notifLead.assignedToId,
            organizationId: notifOrgId,
            title: action.config.title || 'Workflow Notification',
            message: replaceVariables(
              action.config.message || action.config.body || 'You have a new workflow notification.',
              notifLead,
              metadata
            ),
            type: action.config.type || 'WORKFLOW',
            read: false,
          },
        });
        logger.info(`[Workflow] Notification created for user ${notifLead.assignedToId} re: lead ${leadId}`);
      } else if (notifLead) {
        // Lead has no assigned user — notify organization admins as fallback
        const notifOrgId = organizationId || notifLead.organizationId;
        if (notifOrgId) {
          const admins = await prisma.user.findMany({
            where: { organizationId: notifOrgId, role: { in: ['ADMIN', 'MANAGER'] } },
            select: { id: true },
            take: 5,
          });
          for (const admin of admins) {
            await prisma.notification.create({
              data: {
                userId: admin.id,
                organizationId: notifOrgId,
                title: action.config.title || 'Workflow Notification (Unassigned Lead)',
                message: replaceVariables(
                  action.config.message || action.config.body || 'You have a new workflow notification for an unassigned lead.',
                  notifLead,
                  metadata
                ),
                type: action.config.type || 'WORKFLOW',
                read: false,
              },
            });
          }
          logger.info(`[Workflow] Notification sent to ${admins.length} admin(s) for unassigned lead ${leadId}`);
        } else {
          logger.warn(`[Workflow] Lead ${leadId} has no assignedTo and no organization, skipping SEND_NOTIFICATION`);
        }
      } else {
        logger.warn(`[Workflow] Lead ${leadId} not found, skipping SEND_NOTIFICATION`);
      }
      break;

    case 'WEBHOOK':
      // Make HTTP request to configured webhook URL
      const webhookUrl = action.config.url;
      if (!webhookUrl) {
        logger.warn('[Workflow] No URL configured for WEBHOOK action, skipping');
        break;
      }
      // SSRF protection: block private/internal IP ranges and localhost
      try {
        const parsedUrl = new URL(webhookUrl as string);
        const hostname = parsedUrl.hostname.toLowerCase();
        const blockedPatterns = ['localhost', '127.0.0.1', '0.0.0.0', '::1', '169.254.', '10.', '192.168.', 'metadata.google'];
        const isBlocked = blockedPatterns.some(p => hostname.startsWith(p)) ||
          hostname.startsWith('172.') && (() => {
            const second = parseInt(hostname.split('.')[1], 10);
            return second >= 16 && second <= 31;
          })();
        if (isBlocked || !['http:', 'https:'].includes(parsedUrl.protocol)) {
          logger.warn(`[Workflow] SSRF blocked: webhook URL ${webhookUrl} targets a restricted address`);
          break;
        }
      } catch {
        logger.warn(`[Workflow] Invalid webhook URL: ${webhookUrl}`);
        break;
      }
      try {
        const webhookPayload = {
          event: 'workflow_trigger',
          workflowId: metadata?.workflowId || null,
          leadId: leadId || null,
          timestamp: new Date().toISOString(),
          data: action.config.payload || action.config.data || {},
        };
        // Parse headers if they are stored as a JSON string  
        let parsedHeaders: Record<string, string> = {};
        if (typeof action.config.headers === 'string' && action.config.headers.trim()) {
          try {
            parsedHeaders = JSON.parse(action.config.headers);
          } catch {
            logger.warn(`[Workflow] Invalid JSON in webhook headers: ${action.config.headers}`);
          }
        } else if (typeof action.config.headers === 'object' && action.config.headers) {
          parsedHeaders = action.config.headers as Record<string, string>;
        }
        const webhookResponse = await fetch(webhookUrl as string, {
          method: (action.config.method as string) || 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...parsedHeaders,
          },
          body: JSON.stringify(webhookPayload),
          signal: AbortSignal.timeout(10000), // 10s timeout
        });
        logger.info(`[Workflow] Webhook called: ${webhookUrl} — status ${webhookResponse.status}`);
      } catch (webhookErr) {
        logger.error(`[Workflow] Webhook failed for ${webhookUrl}:`, webhookErr);
      }
      break;

    default:
      logger.warn(`Unknown action type: ${action.type}`);
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
      successRate: totalExecutions > 0 ? calcRate(successfulExecutions, totalExecutions) : null,
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
      steps: {
        orderBy: { stepIndex: 'asc' },
      },
      lead: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
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
    successRate: calcRate(executions.filter(e => e.status === ExecutionStatus.SUCCESS).length, executions.length),
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

/**
 * Recover and resume delayed workflow actions that were lost due to server restart.
 * Scans WorkflowExecution records with RUNNING status that have scheduledFor metadata.
 * Should be called on server startup and/or periodically.
 */
export async function recoverDelayedWorkflowActions(): Promise<number> {
  const now = new Date();
  let recovered = 0;

  try {
    // Find RUNNING executions (these might have pending delays)
    const executions = await prisma.workflowExecution.findMany({
      where: {
        status: 'RUNNING',
      },
      select: {
        id: true,
        workflowId: true,
        leadId: true,
        metadata: true,
        workflow: { select: { organizationId: true } },
      },
      take: 200,
    });

    for (const exec of executions) {
      const meta = exec.metadata as any;
      if (!meta?.scheduledActions || !meta?.scheduledFor) continue;

      const scheduledFor = new Date(meta.scheduledFor);
      const actions = meta.scheduledActions as WorkflowAction[];

      if (!Array.isArray(actions) || actions.length === 0) continue;

      // Get the workflow's organizationId
      const orgId = (exec as any).workflow?.organizationId;

      if (scheduledFor <= now) {
        // Already past due — execute immediately
        logger.info(`[Workflow Recovery] Executing ${actions.length} overdue delayed actions for execution ${exec.id}`);
        try {
          await executeActionSequence(actions, exec.leadId || undefined, meta, orgId, false, exec.id);
          recovered++;
        } catch (err) {
          logger.error(`[Workflow Recovery] Failed to execute overdue actions for ${exec.id}:`, err);
        }
      } else {
        // Still in the future — reschedule via setTimeout
        const remainingMs = scheduledFor.getTime() - now.getTime();
        logger.info(`[Workflow Recovery] Rescheduling ${actions.length} actions for execution ${exec.id} (${Math.round(remainingMs / 60000)}min from now)`);
        await scheduleDelayedActions(actions, remainingMs, exec.leadId || undefined, meta, orgId, exec.id);
        recovered++;
      }
    }

    if (recovered > 0) {
      logger.info(`[Workflow Recovery] Recovered ${recovered} delayed workflow executions`);
    }
  } catch (err) {
    logger.error('[Workflow Recovery] Error recovering delayed actions:', err);
  }

  return recovered;
}
