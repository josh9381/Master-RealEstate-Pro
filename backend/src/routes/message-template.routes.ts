import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validateBody, validateParams } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import {
  createMessageTemplateSchema,
  updateMessageTemplateSchema,
  messageTemplateIdSchema,
} from '../validators/message-template.validator';
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
router.post('/', validateBody(createMessageTemplateSchema), asyncHandler(createMessageTemplate));
router.put('/:id', validateParams(messageTemplateIdSchema), validateBody(updateMessageTemplateSchema), asyncHandler(updateMessageTemplate));
router.delete('/:id', validateParams(messageTemplateIdSchema), asyncHandler(deleteMessageTemplate));

export default router;
