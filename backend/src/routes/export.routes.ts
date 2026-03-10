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
import { exportLimiter } from '../middleware/rateLimiter';
import { exportData } from '../controllers/export.controller';

const router = Router();

router.use(authenticate);
router.use(exportLimiter);

router.get('/:type', exportData);

export default router;
