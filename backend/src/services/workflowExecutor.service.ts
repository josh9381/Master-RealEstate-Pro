import { prisma } from '../config/database';
import { ExecutionStatus, WorkflowTrigger } from '@prisma/client';
import { executeWorkflow, triggerWorkflowsForLead } from './workflow.service';

/**
 * Workflow Executor Service
 * 
 * Handles background execution of workflows with:
 * - Queue management
 * - Retry logic
 * - Execution tracking
 * - Error handling
 * - Performance monitoring
 */

// ===================================
// Types
// ===================================

export interface ExecutionQueueItem {
  workflowId: string;
  leadId?: string;
  triggerType: WorkflowTrigger;
  metadata?: Record<string, unknown>;
  retryCount?: number;
  scheduledFor?: Date;
  priority?: 'low' | 'normal' | 'high' | 'critical';
}

export interface ExecutionResult {
  executionId: string;
  workflowId: string;
  status: ExecutionStatus;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  duration?: number;
}

// ===================================
// In-Memory Execution Queue
// ===================================

const executionQueue: ExecutionQueueItem[] = [];
const maxRetries = 3;
const retryDelays = [1000, 5000, 15000]; // Delays in ms for each retry attempt
let isProcessing = false;

/**
 * Add workflow execution to queue
 */
export function enqueueWorkflow(item: ExecutionQueueItem): void {
  const queueItem: ExecutionQueueItem = {
    ...item,
    retryCount: 0,
    priority: item.priority || 'normal',
    scheduledFor: item.scheduledFor || new Date(),
  };

  // Add to queue based on priority
  if (queueItem.priority === 'critical') {
    executionQueue.unshift(queueItem);
  } else if (queueItem.priority === 'high') {
    const criticalCount = executionQueue.filter(i => i.priority === 'critical').length;
    executionQueue.splice(criticalCount, 0, queueItem);
  } else {
    executionQueue.push(queueItem);
  }

  console.log(`Enqueued workflow ${item.workflowId} with priority ${queueItem.priority}. Queue size: ${executionQueue.length}`);

  // Start processing if not already running
  if (!isProcessing) {
    processQueue();
  }
}

/**
 * Get current queue status
 */
export function getQueueStatus() {
  return {
    queueSize: executionQueue.length,
    isProcessing,
    breakdown: {
      critical: executionQueue.filter(i => i.priority === 'critical').length,
      high: executionQueue.filter(i => i.priority === 'high').length,
      normal: executionQueue.filter(i => i.priority === 'normal').length,
      low: executionQueue.filter(i => i.priority === 'low').length,
    },
  };
}

/**
 * Clear all items from queue (use with caution)
 */
export function clearQueue(): void {
  const originalSize = executionQueue.length;
  executionQueue.length = 0;
  console.log(`Cleared ${originalSize} items from execution queue`);
}

// ===================================
// Queue Processor
// ===================================

/**
 * Process the execution queue
 */
async function processQueue(): Promise<void> {
  if (isProcessing) {
    return;
  }

  isProcessing = true;

  while (executionQueue.length > 0) {
    const item = executionQueue.shift();
    
    if (!item) {
      continue;
    }

    // Check if scheduled for future
    if (item.scheduledFor && item.scheduledFor > new Date()) {
      // Re-queue for later
      executionQueue.push(item);
      continue;
    }

    try {
      await executeQueueItem(item);
    } catch (error) {
      console.error(`Error executing workflow ${item.workflowId}:`, error);
      
      // Handle retry logic
      if (item.retryCount !== undefined && item.retryCount < maxRetries) {
        await handleRetry(item, error);
      } else {
        await logFailedExecution(item, error);
      }
    }

    // Small delay between executions to prevent overwhelming the system
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  isProcessing = false;
}

/**
 * Execute a single queue item
 */
async function executeQueueItem(item: ExecutionQueueItem): Promise<ExecutionResult> {
  const startTime = Date.now();

  try {
    console.log(`Executing workflow ${item.workflowId} for lead ${item.leadId || 'N/A'}`);

    const executionId = await executeWorkflow(item.workflowId, item.leadId, item.metadata);

    const duration = Date.now() - startTime;

    const result: ExecutionResult = {
      executionId,
      workflowId: item.workflowId,
      status: ExecutionStatus.SUCCESS,
      startedAt: new Date(startTime),
      completedAt: new Date(),
      duration,
    };

    console.log(`Workflow ${item.workflowId} completed successfully in ${duration}ms`);

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;

    const result: ExecutionResult = {
      executionId: 'failed',
      workflowId: item.workflowId,
      status: ExecutionStatus.FAILED,
      startedAt: new Date(startTime),
      completedAt: new Date(),
      duration,
      error: error instanceof Error ? error.message : 'Unknown error',
    };

    throw error;
  }
}

/**
 * Handle retry logic for failed executions
 */
async function handleRetry(item: ExecutionQueueItem, error: unknown): Promise<void> {
  const retryCount = (item.retryCount || 0) + 1;
  const delay = retryDelays[retryCount - 1] || retryDelays[retryDelays.length - 1];

  console.log(`Scheduling retry ${retryCount}/${maxRetries} for workflow ${item.workflowId} in ${delay}ms`);

  // Schedule retry
  setTimeout(() => {
    enqueueWorkflow({
      ...item,
      retryCount,
      scheduledFor: new Date(Date.now() + delay),
    });
  }, delay);

  // Log retry attempt
  await logRetryAttempt(item, retryCount, error);
}

/**
 * Log failed execution after all retries exhausted
 */
async function logFailedExecution(item: ExecutionQueueItem, error: unknown): Promise<void> {
  console.error(`Workflow ${item.workflowId} failed after ${item.retryCount} retries`);

  // Could send alert/notification here
  await createExecutionLog({
    workflowId: item.workflowId,
    leadId: item.leadId,
    status: ExecutionStatus.FAILED,
    error: error instanceof Error ? error.message : 'Unknown error',
    metadata: {
      ...item.metadata,
      retries: item.retryCount,
      finalFailure: true,
    },
  });
}

/**
 * Log retry attempt
 */
async function logRetryAttempt(item: ExecutionQueueItem, retryCount: number, error: unknown): Promise<void> {
  await createExecutionLog({
    workflowId: item.workflowId,
    leadId: item.leadId,
    status: ExecutionStatus.FAILED,
    error: error instanceof Error ? error.message : 'Unknown error',
    metadata: {
      ...item.metadata,
      retryAttempt: retryCount,
      willRetry: retryCount < maxRetries,
    },
  });
}

/**
 * Create execution log entry
 */
async function createExecutionLog(data: {
  workflowId: string;
  leadId?: string;
  status: ExecutionStatus;
  error?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.workflowExecution.create({
      data: {
        workflowId: data.workflowId,
        leadId: data.leadId,
        status: data.status,
        error: data.error,
        metadata: data.metadata as any,
        startedAt: new Date(),
        completedAt: data.status !== ExecutionStatus.RUNNING ? new Date() : undefined,
      },
    });
  } catch (error) {
    console.error('Failed to create execution log:', error);
  }
}

// ===================================
// Batch Processing
// ===================================

/**
 * Batch execute workflows for multiple leads
 */
export async function batchExecuteWorkflows(
  workflowId: string,
  leadIds: string[],
  metadata?: Record<string, unknown>
): Promise<void> {
  console.log(`Batch executing workflow ${workflowId} for ${leadIds.length} leads`);

  for (const leadId of leadIds) {
    enqueueWorkflow({
      workflowId,
      leadId,
      triggerType: WorkflowTrigger.MANUAL,
      metadata,
      priority: 'normal',
    });
  }
}

/**
 * Process time-based workflows (should be called by cron job)
 */
export async function processTimeBasedWorkflows(): Promise<void> {
  console.log('Processing time-based workflows...');

  const timeBasedWorkflows = await prisma.workflow.findMany({
    where: {
      isActive: true,
      triggerType: WorkflowTrigger.TIME_BASED,
    },
  });

  for (const workflow of timeBasedWorkflows) {
    const triggerData = workflow.triggerData as { schedule?: string };
    
    // Simple check - in production, use a proper cron parser
    if (triggerData?.schedule) {
      enqueueWorkflow({
        workflowId: workflow.id,
        triggerType: WorkflowTrigger.TIME_BASED,
        metadata: { scheduled: true },
        priority: 'normal',
      });
    }
  }
}

// ===================================
// Event Handlers
// ===================================

/**
 * Handle lead created event
 */
export async function onLeadCreated(leadId: string): Promise<void> {
  console.log(`Lead created: ${leadId}. Triggering workflows...`);

  try {
    const results = await triggerWorkflowsForLead(
      leadId,
      WorkflowTrigger.LEAD_CREATED,
      { event: 'lead_created' }
    );

    console.log(`Triggered ${results.length} workflows for new lead ${leadId}`);
  } catch (error) {
    console.error(`Failed to trigger workflows for new lead ${leadId}:`, error);
  }
}

/**
 * Handle lead status changed event
 */
export async function onLeadStatusChanged(
  leadId: string,
  fromStatus: string,
  toStatus: string
): Promise<void> {
  console.log(`Lead ${leadId} status changed: ${fromStatus} → ${toStatus}`);

  try {
    const results = await triggerWorkflowsForLead(
      leadId,
      WorkflowTrigger.LEAD_STATUS_CHANGED,
      { event: 'status_changed', fromStatus, toStatus }
    );

    console.log(`Triggered ${results.length} workflows for status change`);
  } catch (error) {
    console.error(`Failed to trigger workflows for status change:`, error);
  }
}

/**
 * Handle email opened event
 */
export async function onEmailOpened(
  leadId: string,
  campaignId: string,
  messageId: string
): Promise<void> {
  console.log(`Lead ${leadId} opened email from campaign ${campaignId}`);

  try {
    const results = await triggerWorkflowsForLead(
      leadId,
      WorkflowTrigger.EMAIL_OPENED,
      { event: 'email_opened', campaignId, messageId }
    );

    console.log(`Triggered ${results.length} workflows for email open`);
  } catch (error) {
    console.error(`Failed to trigger workflows for email open:`, error);
  }
}

/**
 * Handle score threshold crossed event
 */
export async function onScoreThresholdCrossed(
  leadId: string,
  previousScore: number,
  newScore: number
): Promise<void> {
  console.log(`Lead ${leadId} score changed: ${previousScore} → ${newScore}`);

  try {
    const results = await triggerWorkflowsForLead(
      leadId,
      WorkflowTrigger.SCORE_THRESHOLD,
      { event: 'score_changed', previousScore, newScore }
    );

    console.log(`Triggered ${results.length} workflows for score change`);
  } catch (error) {
    console.error(`Failed to trigger workflows for score change:`, error);
  }
}

/**
 * Handle campaign completed event
 */
export async function onCampaignCompleted(campaignId: string): Promise<void> {
  console.log(`Campaign ${campaignId} completed`);

  // Get all leads from the campaign activities
  const activities = await prisma.activity.findMany({
    where: {
      campaignId,
      leadId: { not: null },
    },
    select: { leadId: true },
    distinct: ['leadId'],
  });

  for (const activity of activities) {
    if (activity.leadId) {
      try {
        await triggerWorkflowsForLead(
          activity.leadId,
          WorkflowTrigger.CAMPAIGN_COMPLETED,
          { event: 'campaign_completed', campaignId }
        );
      } catch (error) {
        console.error(`Failed to trigger workflows for lead ${activity.leadId}:`, error);
      }
    }
  }
}

// ===================================
// Monitoring & Statistics
// ===================================

/**
 * Get execution statistics
 */
export async function getExecutionStats(days: number = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const executions = await prisma.workflowExecution.findMany({
    where: {
      startedAt: { gte: startDate },
    },
  });

  const totalExecutions = executions.length;
  const successfulExecutions = executions.filter(e => e.status === ExecutionStatus.SUCCESS).length;
  const failedExecutions = executions.filter(e => e.status === ExecutionStatus.FAILED).length;
  const runningExecutions = executions.filter(e => e.status === ExecutionStatus.RUNNING).length;

  // Calculate average duration
  const completedExecutions = executions.filter(e => e.completedAt && e.startedAt);
  const totalDuration = completedExecutions.reduce((sum, exec) => {
    const duration = exec.completedAt!.getTime() - exec.startedAt.getTime();
    return sum + duration;
  }, 0);
  const avgDuration = completedExecutions.length > 0 ? totalDuration / completedExecutions.length : 0;

  return {
    totalExecutions,
    successfulExecutions,
    failedExecutions,
    runningExecutions,
    successRate: totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0,
    avgDurationMs: Math.round(avgDuration),
    queueStatus: getQueueStatus(),
  };
}

/**
 * Get failed executions that can be retried
 */
export async function getRetryableExecutions(limit: number = 50) {
  const executions = await prisma.workflowExecution.findMany({
    where: {
      status: ExecutionStatus.FAILED,
      completedAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      },
    },
    include: {
      workflow: {
        select: {
          id: true,
          name: true,
          isActive: true,
        },
      },
    },
    orderBy: { completedAt: 'desc' },
    take: limit,
  });

  return executions.filter(e => e.workflow.isActive);
}

/**
 * Retry failed execution
 */
export async function retryExecution(executionId: string): Promise<void> {
  const execution = await prisma.workflowExecution.findUnique({
    where: { id: executionId },
    include: { workflow: true },
  });

  if (!execution) {
    throw new Error('Execution not found');
  }

  if (!execution.workflow.isActive) {
    throw new Error('Cannot retry execution for inactive workflow');
  }

  enqueueWorkflow({
    workflowId: execution.workflowId,
    leadId: execution.leadId || undefined,
    triggerType: WorkflowTrigger.MANUAL,
    metadata: { ...execution.metadata as object, retry: true, originalExecutionId: executionId },
    priority: 'high',
  });
}

export default {
  enqueueWorkflow,
  getQueueStatus,
  clearQueue,
  batchExecuteWorkflows,
  processTimeBasedWorkflows,
  onLeadCreated,
  onLeadStatusChanged,
  onEmailOpened,
  onScoreThresholdCrossed,
  onCampaignCompleted,
  getExecutionStats,
  getRetryableExecutions,
  retryExecution,
};
