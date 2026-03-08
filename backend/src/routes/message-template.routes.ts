import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import {
  getMessageTemplates,
  getCategories,
  createMessageTemplate,
  updateMessageTemplate,
  deleteMessageTemplate,
  seedDefaults,
} from '../controllers/message-template.controller';

const router = Router();

router.use(authenticate);

router.get('/categories', asyncHandler(getCategories));
router.get('/', asyncHandler(getMessageTemplates));
router.post('/seed-defaults', asyncHandler(seedDefaults));
router.post('/', asyncHandler(createMessageTemplate));
router.put('/:id', asyncHandler(updateMessageTemplate));
router.delete('/:id', asyncHandler(deleteMessageTemplate));

export default router;
