import { Request, Response } from 'express'
import { logger } from '../lib/logger'
import { exportToResponse, ExportOptions } from '../services/export.service'
import prisma from '../config/database'

export const exportData = async (req: Request, res: Response) => {
  try {
    const { type } = req.params
    const organizationId = req.user?.organizationId
    const userId = req.user?.userId

    if (!organizationId || !userId) {
      return res.status(400).json({ success: false, message: 'Organization required' })
    }

    // Check export permission
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    })

    if (!user || !['ADMIN', 'MANAGER'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to export data',
      })
    }

    const validTypes = ['leads', 'campaigns', 'activities']
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid export type. Must be one of: ${validTypes.join(', ')}`,
      })
    }

    const format = (req.query.format as string)?.toLowerCase() === 'csv' ? 'csv' : 'xlsx'

    const options: ExportOptions = {
      organizationId,
      format: format as 'xlsx' | 'csv',
      type: type as 'leads' | 'campaigns' | 'activities',
      filters: {
        status: req.query.status as string | undefined,
        source: req.query.source as string | undefined,
        assignedTo: req.query.assignedTo as string | undefined,
        dateFrom: req.query.dateFrom as string | undefined,
        dateTo: req.query.dateTo as string | undefined,
      },
      fields: req.query.fields ? (req.query.fields as string).split(',') : undefined,
    }

    await exportToResponse(res, options)
  } catch (error: unknown) {
    logger.error('[EXPORT] Error:', error)
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Export failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }
}
