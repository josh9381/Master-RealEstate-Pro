import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middleware/auth';
import { validateBody, validateParams } from '../middleware/validate';
import {
  getCustomFields,
  getCustomField,
  createCustomField,
  updateCustomField,
  deleteCustomField,
  reorderCustomFields,
} from '../controllers/custom-field.controller';
import {
  createCustomFieldSchema,
  updateCustomFieldSchema,
  customFieldIdSchema,
  reorderCustomFieldsSchema,
} from '../validators/custom-field.validator';
import { sensitiveLimiter } from '../middleware/rateLimiter';

const router = Router();
router.use(authenticate);

router.get('/', asyncHandler(getCustomFields));
router.post('/', sensitiveLimiter, validateBody(createCustomFieldSchema), asyncHandler(createCustomField));
router.put('/reorder', validateBody(reorderCustomFieldsSchema), asyncHandler(reorderCustomFields));
router.get('/:id', validateParams(customFieldIdSchema), asyncHandler(getCustomField));
router.put('/:id', validateParams(customFieldIdSchema), validateBody(updateCustomFieldSchema), asyncHandler(updateCustomField));
router.delete('/:id', sensitiveLimiter, validateParams(customFieldIdSchema), asyncHandler(deleteCustomField));

export default router;
