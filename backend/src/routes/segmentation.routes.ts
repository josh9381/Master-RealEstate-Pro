/**
 * Segmentation Routes
 * CRUD for rule-based customer segments
 */

import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middleware/auth';
import { validateBody, validateParams } from '../middleware/validate';
import { createSegmentSchema, updateSegmentSchema, segmentIdParamSchema } from '../validators/segmentation.validator';
import * as segCtrl from '../controllers/segmentation.controller';

const router = Router();
router.use(authenticate);

router.get('/', asyncHandler(segCtrl.list));
router.post('/', validateBody(createSegmentSchema), asyncHandler(segCtrl.create));
router.get('/:id', validateParams(segmentIdParamSchema), asyncHandler(segCtrl.getById));
router.patch('/:id', validateParams(segmentIdParamSchema), validateBody(updateSegmentSchema), asyncHandler(segCtrl.update));
router.delete('/:id', validateParams(segmentIdParamSchema), asyncHandler(segCtrl.remove));
router.get('/:id/members', validateParams(segmentIdParamSchema), asyncHandler(segCtrl.members));
router.post('/refresh', asyncHandler(segCtrl.refresh));

export default router;
