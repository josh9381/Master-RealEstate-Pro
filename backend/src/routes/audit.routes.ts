/**
 * Audit Log Routes — Phase 9.4
 * Admin-only endpoints for viewing audit trail
 */
import { Router, Request, Response } from 'express'
import { AuditAction } from '@prisma/client'
import { authenticate, requireAdmin } from '../middleware/auth'
import { queryAuditLogs } from '../services/audit.service'

const router = Router()

router.use(authenticate)
router.use(requireAdmin)

/**
 * @route   GET /api/admin/audit-logs
 * @desc    List audit logs with filters (admin only)
 * @access  Admin
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      userId,
      action,
      entityType,
      startDate,
      endDate,
      page,
      limit,
    } = req.query

    const result = await queryAuditLogs({
      organizationId: req.user!.organizationId,
      userId: userId as string | undefined,
      action: action as AuditAction | undefined,
      entityType: entityType as string | undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? Math.min(parseInt(limit as string, 10), 100) : 50,
    })

    res.json({ success: true, data: result })
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    res.status(500).json({ success: false, message: 'Failed to fetch audit logs' })
  }
})

/**
 * @route   GET /api/admin/audit-logs/actions
 * @desc    List all available audit action types
 * @access  Admin
 */
router.get('/actions', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: Object.values(AuditAction),
  })
})

export default router
