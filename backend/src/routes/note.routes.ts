import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middleware/auth';
import { validateBody, validateParams } from '../middleware/validate';
import {
  getNote,
  updateNote,
  deleteNote,
} from '../controllers/note.controller';
import {
  updateNoteSchema,
  noteIdSchema,
} from '../validators/note.validator';
import { sensitiveLimiter } from '../middleware/rateLimiter';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/notes/:id
 * @desc    Get a single note by ID
 * @access  Private
 */
router.get('/:id', validateParams(noteIdSchema), asyncHandler(getNote));

/**
 * @route   PUT /api/notes/:id
 * @desc    Update a note (author only)
 * @access  Private
 */
router.put(
  '/:id',
  validateParams(noteIdSchema),
  validateBody(updateNoteSchema),
  asyncHandler(updateNote)
);

/**
 * @route   DELETE /api/notes/:id
 * @desc    Delete a note (author or admin only)
 * @access  Private
 */
router.delete(
  '/:id',
  validateParams(noteIdSchema),
  sensitiveLimiter,
  asyncHandler(deleteNote)
);

export default router;
