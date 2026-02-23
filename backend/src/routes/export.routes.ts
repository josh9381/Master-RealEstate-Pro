/**
 * Export Routes — Server-side export for large datasets
 * Phase 8.8
 * 
 * GET /api/export/leads?format=xlsx&status=NEW&dateFrom=2025-01-01
 * GET /api/export/campaigns?format=csv
 * GET /api/export/activities?format=xlsx
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { exportToResponse, ExportOptions } from '../services/export.service';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/export/:type
 * type: leads | campaigns | activities
 * Query params:
 *   format: xlsx | csv (default: xlsx)
 *   status: filter by status
 *   source: filter by source
 *   assignedTo: filter by assigned user ID
 *   dateFrom: ISO date string
 *   dateTo: ISO date string
 *   fields: comma-separated field keys to include
 */
router.get('/:type', async (req: any, res) => {
  try {
    const { type } = req.params;
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'Organization required' });
    }

    const validTypes = ['leads', 'campaigns', 'activities'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid export type. Must be one of: ${validTypes.join(', ')}`,
      });
    }

    const format = (req.query.format as string)?.toLowerCase() === 'csv' ? 'csv' : 'xlsx';

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
    };

    await exportToResponse(res, options);
  } catch (error: any) {
    console.error('[EXPORT] Error:', error);
    // Only send error if headers haven't been sent yet
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Export failed',
        error: error.message,
      });
    }
  }
});

export default router;
