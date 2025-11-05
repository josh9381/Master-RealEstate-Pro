import { prisma } from '../config/database';
import { WorkflowTrigger, ExecutionStatus } from '@prisma/client';

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
// Type Definitions
// ===================================

export interface WorkflowCondition {
  field: string;
  operator: 'equals' | 'notEquals' | 'contains' | 'notContains' | 'greaterThan' | 'lessThan' | 'greaterThanOrEqual' | 'lessThanOrEqual' | 'in' | 'notIn';
  value: any;
}

export interface WorkflowAction {
  type: 'SEND_EMAIL' | 'SEND_SMS' | 'UPDATE_LEAD' | 'ADD_TAG' | 'REMOVE_TAG' | 'CREATE_TASK' | 'ASSIGN_LEAD' | 'ADD_TO_CAMPAIGN' | 'UPDATE_SCORE' | 'SEND_NOTIFICATION' | 'WEBHOOK';
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
 */
export async function executeWorkflow(
  workflowId: string,
  leadId?: string,
  metadata?: any
) {
  const workflow = await prisma.workflow.findUnique({
    where: { id: workflowId },
  });

  if (!workflow) {
    throw new Error('Workflow not found');
  }

  if (!workflow.isActive) {
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
    // Execute actions
    const actionsConfig = workflow.actions as any;
    const actions = actionsConfig.actions || [];

    for (const action of actions) {
      await executeAction(action, leadId, metadata);
    }

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
 * Execute a single workflow action
 */
async function executeAction(action: WorkflowAction, leadId?: string, metadata?: any) {
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
      const existingTag = await prisma.tag.findFirst({
        where: {
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
      await prisma.task.create({
        data: {
          title: action.config.title,
          description: action.config.description,
          dueDate: action.config.dueDate ? new Date(action.config.dueDate) : undefined,
          priority: action.config.priority || 'MEDIUM',
          leadId,
          assignedToId: action.config.assignedToId,
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
      // This would integrate with email service
      // For now, just log the action
      console.log(`Sending email to lead ${leadId}:`, action.config);
      break;

    case 'SEND_SMS':
      if (!leadId) throw new Error('Lead ID required for SEND_SMS action');
      // This would integrate with SMS service
      // For now, just log the action
      console.log(`Sending SMS to lead ${leadId}:`, action.config);
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
