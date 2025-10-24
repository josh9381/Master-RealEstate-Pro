import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middleware/auth';
import { validateBody, validateParams } from '../middleware/validate';
import {
  getTags,
  getTag,
  createTag,
  updateTag,
  deleteTag,
} from '../controllers/tag.controller';
import {
  createTagSchema,
  updateTagSchema,
  tagIdSchema,
} from '../validators/tag.validator';
import { sensitiveLimiter } from '../middleware/rateLimiter';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Tag CRUD routes
router.get('/', asyncHandler(getTags));
router.post(
  '/',
  sensitiveLimiter,
  validateBody(createTagSchema),
  asyncHandler(createTag)
);
router.get('/:id', validateParams(tagIdSchema), asyncHandler(getTag));
router.put(
  '/:id',
  validateParams(tagIdSchema),
  validateBody(updateTagSchema),
  asyncHandler(updateTag)
);
router.delete(
  '/:id',
  sensitiveLimiter,
  validateParams(tagIdSchema),
  asyncHandler(deleteTag)
);

export default router;
