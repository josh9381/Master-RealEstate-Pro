import { processTimeBasedWorkflows, getQueueStatus, getExecutionStats } from '../services/workflowExecutor.service';

/**
 * Workflow Background Job Processor
 * 
 * Runs periodic tasks for workflow automation:
 * - Process time-based workflows
 * - Monitor queue health
 * - Clean up old execution logs
 * - Generate performance reports
 */

// ===================================
// Configuration
// ===================================

const INTERVALS = {
  TIME_BASED_CHECK: 60 * 1000, // Check every minute
  QUEUE_MONITOR: 30 * 1000,    // Monitor every 30 seconds
  STATS_REPORT: 5 * 60 * 1000,  // Report every 5 minutes
  LOG_CLEANUP: 24 * 60 * 60 * 1000, // Clean up daily
};

// ===================================
// Job Functions
// ===================================

/**
 * Process time-based workflows
 * This should run frequently (e.g., every minute) to check for scheduled workflows
 */
async function timeBasedWorkflowJob() {
  try {
    console.log('[Job] Processing time-based workflows...');
    await processTimeBasedWorkflows();
    console.log('[Job] Time-based workflow processing complete');
  } catch (error) {
    console.error('[Job] Error processing time-based workflows:', error);
  }
}

/**
 * Monitor queue health
 * Check queue size and alert if too large
 */
async function queueMonitorJob() {
  try {
    const status = getQueueStatus();
    
    if (status.queueSize > 1000) {
      console.warn(`[Job] ⚠️ Queue size is large: ${status.queueSize} items`);
      // Could send alert/notification here
    }
    
    if (status.queueSize > 0) {
      console.log(`[Job] Queue status: ${status.queueSize} items, Processing: ${status.isProcessing}`);
      console.log(`[Job] Breakdown - Critical: ${status.breakdown.critical}, High: ${status.breakdown.high}, Normal: ${status.breakdown.normal}, Low: ${status.breakdown.low}`);
    }
  } catch (error) {
    console.error('[Job] Error monitoring queue:', error);
  }
}

/**
 * Generate and log execution statistics
 */
async function statsReportJob() {
  try {
    console.log('[Job] Generating execution statistics...');
    const stats = await getExecutionStats(7);
    
    console.log('[Job] Execution Stats (Last 7 days):');
    console.log(`  - Total Executions: ${stats.totalExecutions}`);
    console.log(`  - Successful: ${stats.successfulExecutions} (${stats.successRate.toFixed(1)}%)`);
    console.log(`  - Failed: ${stats.failedExecutions}`);
    console.log(`  - Running: ${stats.runningExecutions}`);
    console.log(`  - Avg Duration: ${stats.avgDurationMs}ms`);
    console.log(`  - Current Queue Size: ${stats.queueStatus.queueSize}`);
  } catch (error) {
    console.error('[Job] Error generating stats report:', error);
  }
}

/**
 * Clean up old execution logs
 * Remove logs older than retention period
 */
async function logCleanupJob() {
  try {
    console.log('[Job] Starting log cleanup...');
    
    const { prisma } = await import('../config/database');
    
    // Delete execution logs older than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const result = await prisma.workflowExecution.deleteMany({
      where: {
        completedAt: {
          lt: thirtyDaysAgo,
        },
      },
    });
    
    console.log(`[Job] Cleaned up ${result.count} old execution logs`);
  } catch (error) {
    console.error('[Job] Error cleaning up logs:', error);
  }
}

// ===================================
// Job Scheduler
// ===================================

const scheduledJobs: NodeJS.Timeout[] = [];

/**
 * Start all background jobs
 */
export function startWorkflowJobs() {
  console.log('[Job Scheduler] Starting workflow background jobs...');

  // Time-based workflow processor
  const timeBasedJob = setInterval(timeBasedWorkflowJob, INTERVALS.TIME_BASED_CHECK);
  scheduledJobs.push(timeBasedJob);
  
  // Queue monitor
  const queueMonitor = setInterval(queueMonitorJob, INTERVALS.QUEUE_MONITOR);
  scheduledJobs.push(queueMonitor);
  
  // Stats reporter
  const statsReporter = setInterval(statsReportJob, INTERVALS.STATS_REPORT);
  scheduledJobs.push(statsReporter);
  
  // Log cleanup (runs daily)
  const logCleanup = setInterval(logCleanupJob, INTERVALS.LOG_CLEANUP);
  scheduledJobs.push(logCleanup);

  // Run initial jobs
  timeBasedWorkflowJob();
  statsReportJob();

  console.log('[Job Scheduler] All background jobs started');
  console.log(`[Job Scheduler] Time-based check: every ${INTERVALS.TIME_BASED_CHECK / 1000}s`);
  console.log(`[Job Scheduler] Queue monitor: every ${INTERVALS.QUEUE_MONITOR / 1000}s`);
  console.log(`[Job Scheduler] Stats report: every ${INTERVALS.STATS_REPORT / 1000 / 60}min`);
  console.log(`[Job Scheduler] Log cleanup: every ${INTERVALS.LOG_CLEANUP / 1000 / 60 / 60}hrs`);
}

/**
 * Stop all background jobs
 */
export function stopWorkflowJobs() {
  console.log('[Job Scheduler] Stopping workflow background jobs...');
  
  scheduledJobs.forEach(job => clearInterval(job));
  scheduledJobs.length = 0;
  
  console.log('[Job Scheduler] All background jobs stopped');
}

/**
 * Graceful shutdown handler
 */
export function setupGracefulShutdown() {
  const handleShutdown = (signal: string) => {
    console.log(`\n[Job Scheduler] Received ${signal}. Shutting down gracefully...`);
    stopWorkflowJobs();
    process.exit(0);
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
}

// ===================================
// Manual Job Execution (for testing)
// ===================================

/**
 * Run a specific job manually (useful for testing)
 */
export async function runJob(jobName: string) {
  console.log(`[Job] Manually running job: ${jobName}`);
  
  switch (jobName) {
    case 'time-based':
      await timeBasedWorkflowJob();
      break;
    case 'queue-monitor':
      await queueMonitorJob();
      break;
    case 'stats-report':
      await statsReportJob();
      break;
    case 'log-cleanup':
      await logCleanupJob();
      break;
    default:
      console.error(`[Job] Unknown job: ${jobName}`);
  }
}

// ===================================
// Export
// ===================================

export default {
  startWorkflowJobs,
  stopWorkflowJobs,
  setupGracefulShutdown,
  runJob,
};
