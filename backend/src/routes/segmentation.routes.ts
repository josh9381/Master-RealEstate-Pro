/**
 * Segmentation Routes
 * CRUD for rule-based customer segments
 */

import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middleware/auth';
import {
  createSegment,
  getSegments,
  getSegmentById,
  updateSegment,
  deleteSegment,
  getSegmentMembers,
  refreshSegmentCounts,
} from '../services/segmentation.service';

const router = Router();
router.use(authenticate);

/**
 * GET /api/segments — list all segments
 */
router.get('/', asyncHandler(async (req: any, res: any) => {
  const segments = await getSegments(req.user!.organizationId);
  res.json({ success: true, data: segments });
}));

/**
 * POST /api/segments — create a new segment
 */
router.post('/', asyncHandler(async (req: any, res: any) => {
  const { name, description, rules, matchType, color } = req.body;

  if (!name || !rules || !Array.isArray(rules) || rules.length === 0) {
    return res.status(400).json({ success: false, message: 'name and rules[] are required' });
  }

  const segment = await createSegment({
    name,
    description,
    rules,
    matchType,
    color,
    organizationId: req.user!.organizationId,
  });

  res.status(201).json({ success: true, data: segment });
}));

/**
 * GET /api/segments/:id — get a single segment
 */
router.get('/:id', asyncHandler(async (req: any, res: any) => {
  const segment = await getSegmentById(req.params.id, req.user!.organizationId);
  res.json({ success: true, data: segment });
}));

/**
 * PATCH /api/segments/:id — update a segment
 */
router.patch('/:id', asyncHandler(async (req: any, res: any) => {
  const { name, description, rules, matchType, color, isActive } = req.body;
  const segment = await updateSegment(req.params.id, req.user!.organizationId, {
    name, description, rules, matchType, color, isActive,
  });
  res.json({ success: true, data: segment });
}));

/**
 * DELETE /api/segments/:id — delete a segment
 */
router.delete('/:id', asyncHandler(async (req: any, res: any) => {
  await deleteSegment(req.params.id, req.user!.organizationId);
  res.json({ success: true, message: 'Segment deleted' });
}));

/**
 * GET /api/segments/:id/members — get leads matching the segment
 */
router.get('/:id/members', asyncHandler(async (req: any, res: any) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const result = await getSegmentMembers(req.params.id, req.user!.organizationId, { page, limit });
  res.json({ success: true, data: result });
}));

/**
 * POST /api/segments/refresh — refresh member counts for all segments
 */
router.post('/refresh', asyncHandler(async (req: any, res: any) => {
  await refreshSegmentCounts(req.user!.organizationId);
  res.json({ success: true, message: 'Segment counts refreshed' });
}));

export default router;
