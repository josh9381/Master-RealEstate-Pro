/**
 * Audit Service — Phase 9.4
 * Logs significant actions to the AuditLog table.
 * Called from controllers/middleware to record who did what.
 */
import { logger } from '../lib/logger'
import { AuditAction } from '@prisma/client'
import prisma from '../config/database'

interface AuditEntry {
  userId?: string
  organizationId: string
  action: AuditAction
  entityType: string
  entityId?: string
  description: string
  ipAddress?: string
  userAgent?: string
  beforeData?: unknown
  afterData?: unknown
  metadata?: unknown
}

/**
 * Create an audit log entry
 */
export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: entry.userId,
        organizationId: entry.organizationId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId || undefined,
        description: entry.description,
        ipAddress: entry.ipAddress || undefined,
        userAgent: entry.userAgent || undefined,
        beforeData: (entry.beforeData as object) || undefined,
        afterData: (entry.afterData as object) || undefined,
        metadata: (entry.metadata as object) || undefined,
      },
    })
  } catch (error) {
    // Audit logging should never break the main request
    logger.error('Failed to write audit log:', error)
  }
}

/**
 * Helper to extract IP and User-Agent from Express request
 */
export function getRequestContext(req: { ip?: string; headers?: Record<string, string | string[] | undefined> }) {
  return {
    ipAddress: req.ip || (req.headers?.['x-forwarded-for'] as string) || undefined,
    userAgent: (req.headers?.['user-agent'] as string) || undefined,
  }
}

/**
 * Query audit logs with filtering and pagination
 */
export async function queryAuditLogs(params: {
  organizationId: string
  userId?: string
  action?: AuditAction
  entityType?: string
  startDate?: Date
  endDate?: Date
  page?: number
  limit?: number
}) {
  const { organizationId, userId, action, entityType, startDate, endDate, page = 1, limit = 50 } = params

  const where: Record<string, unknown> = { organizationId }
  if (userId) where.userId = userId
  if (action) where.action = action
  if (entityType) where.entityType = entityType
  if (startDate || endDate) {
    where.createdAt = {
      ...(startDate ? { gte: startDate } : {}),
      ...(endDate ? { lte: endDate } : {}),
    }
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ])

  return {
    logs,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }
}
