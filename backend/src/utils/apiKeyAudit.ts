import { Request } from 'express';
import { prisma } from '../config/database';

/**
 * Log API key access for audit trail
 * @param userId - User ID performing the action
 * @param provider - Provider name ('twilio', 'sendgrid', etc.)
 * @param action - Action performed ('created', 'updated', 'accessed', 'deleted')
 * @param req - Express request object (for IP and user agent)
 */
export async function logAPIKeyAccess(
  userId: string,
  provider: string,
  action: 'created' | 'updated' | 'accessed' | 'deleted',
  req?: Request
): Promise<void> {
  try {
    await prisma.aPIKeyAudit.create({
      data: {
        userId,
        provider,
        action,
        ipAddress: req?.ip || req?.headers['x-forwarded-for'] as string || req?.socket?.remoteAddress || null,
        userAgent: req?.headers['user-agent'] || null
      }
    });
    
    console.log(`✅ Audit log: User ${userId} ${action} ${provider} credentials`);
  } catch (error) {
    // Don't throw - audit logging should never break the main flow
    console.error('❌ Failed to create audit log:', error);
  }
}

/**
 * Get audit logs for a user
 * @param userId - User ID to get audit logs for
 * @param limit - Maximum number of logs to retrieve
 * @returns Array of audit log entries
 */
export async function getAPIKeyAuditLogs(userId: string, limit: number = 50) {
  return await prisma.aPIKeyAudit.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit
  });
}

/**
 * Get audit logs for a specific provider
 * @param userId - User ID
 * @param provider - Provider name ('twilio', 'sendgrid', etc.)
 * @param limit - Maximum number of logs to retrieve
 * @returns Array of audit log entries
 */
export async function getProviderAuditLogs(
  userId: string,
  provider: string,
  limit: number = 50
) {
  return await prisma.aPIKeyAudit.findMany({
    where: {
      userId,
      provider
    },
    orderBy: { createdAt: 'desc' },
    take: limit
  });
}
