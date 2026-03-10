import { logger } from '../lib/logger'
import prisma from '../config/database';
import { acquireLock, releaseLock } from '../utils/distributedLock';

/**
 * Stale Data Cleanup Job
 *
 * Periodically prunes expired/stale records to keep the database lean:
 * - Expired RefreshTokens (immediately after expiry)
 * - Expired PasswordResetTokens (7 days after expiry)
 * - Inactive LoginHistory sessions (90 days)
 * - Expired/dismissed AIInsights (30 days after expiry or dismissal)
 *
 * Uses distributed locking so only one instance runs the cleanup at a time.
 */

// ===================================
// Configuration
// ===================================

const CLEANUP_INTERVAL = 60 * 60 * 1000; // Run every hour

const RETENTION = {
  REFRESH_TOKEN_GRACE_DAYS: 0,        // Delete immediately after expiry
  PASSWORD_RESET_TOKEN_GRACE_DAYS: 7,  // Keep 7 days after expiry
  LOGIN_HISTORY_INACTIVE_DAYS: 90,     // Keep 90 days of inactive sessions
  AI_INSIGHT_EXPIRED_DAYS: 30,         // Keep 30 days after expiry/dismissal
};

const LOCK_KEY = 'lock:data-cleanup';
const LOCK_TTL = 300; // 5 minutes max

// ===================================
// Cleanup Functions
// ===================================

/**
 * Delete expired refresh tokens
 * These are useless after expiry — no grace period needed
 */
async function cleanupRefreshTokens(): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION.REFRESH_TOKEN_GRACE_DAYS);

  const result = await prisma.refreshToken.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: cutoff } },
        { revokedAt: { not: null } },
      ],
    },
  });

  return result.count;
}

/**
 * Delete expired password reset tokens
 * Keep for 7 days after expiry for audit trail
 */
async function cleanupPasswordResetTokens(): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION.PASSWORD_RESET_TOKEN_GRACE_DAYS);

  const result = await prisma.passwordResetToken.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: cutoff } },
        { usedAt: { not: null, lt: cutoff } },
      ],
    },
  });

  return result.count;
}

/**
 * Delete old inactive login history entries
 * Only targets sessions that are logged out (isActive: false)
 */
async function cleanupLoginHistory(): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION.LOGIN_HISTORY_INACTIVE_DAYS);

  const result = await prisma.loginHistory.deleteMany({
    where: {
      isActive: false,
      createdAt: { lt: cutoff },
    },
  });

  return result.count;
}

/**
 * Delete expired or long-dismissed AI insights
 * Removes insights that have been expired or dismissed for 30+ days
 */
async function cleanupAIInsights(): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION.AI_INSIGHT_EXPIRED_DAYS);

  const result = await prisma.aIInsight.deleteMany({
    where: {
      OR: [
        // Expired insights past retention
        { expiresAt: { lt: cutoff } },
        // Dismissed insights past retention
        { dismissed: true, dismissedAt: { lt: cutoff } },
      ],
    },
  });

  return result.count;
}

// ===================================
// Main Cleanup Runner
// ===================================

async function runCleanup(): Promise<void> {
  const acquired = await acquireLock(LOCK_KEY, LOCK_TTL);
  if (!acquired) {
    logger.info('[DataCleanup] Another instance is running cleanup — skipping');
    return;
  }

  try {
    logger.info('[DataCleanup] Starting stale data cleanup...');
    const start = Date.now();

    const [refreshTokens, resetTokens, loginHistory, insights] = await Promise.all([
      cleanupRefreshTokens(),
      cleanupPasswordResetTokens(),
      cleanupLoginHistory(),
      cleanupAIInsights(),
    ]);

    const total = refreshTokens + resetTokens + loginHistory + insights;
    const duration = Date.now() - start;

    if (total > 0) {
      logger.info(
        `[DataCleanup] Cleaned up ${total} records in ${duration}ms:`,
        `RefreshTokens=${refreshTokens}`,
        `PasswordResetTokens=${resetTokens}`,
        `LoginHistory=${loginHistory}`,
        `AIInsights=${insights}`
      );
    } else {
      logger.info(`[DataCleanup] No stale records found (${duration}ms)`);
    }
  } catch (error) {
    logger.error('[DataCleanup] Error during cleanup:', error);
  } finally {
    await releaseLock(LOCK_KEY);
  }
}

// ===================================
// Scheduler
// ===================================

let cleanupInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Start the periodic cleanup job
 */
export function startDataCleanup(): void {
  logger.info('[DataCleanup] Starting data cleanup scheduler (interval: 1h)');

  // Run once on startup (after a short delay to let DB connections settle)
  setTimeout(() => {
    runCleanup().catch(err => logger.error('[DataCleanup] Initial run failed:', err));
  }, 30_000); // 30 second delay

  // Then run periodically
  cleanupInterval = setInterval(() => {
    runCleanup().catch(err => logger.error('[DataCleanup] Scheduled run failed:', err));
  }, CLEANUP_INTERVAL);
}

/**
 * Stop the periodic cleanup job (for graceful shutdown)
 */
export function stopDataCleanup(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
    logger.info('[DataCleanup] Cleanup scheduler stopped');
  }
}
