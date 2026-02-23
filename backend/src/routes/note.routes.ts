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
import prisma from '../config/database';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/notes
 * @desc    Create a new note
 * @access  Private
 */
router.post('/', asyncHandler(async (req: any, res: any) => {
  const { leadId, content } = req.body;
  if (!leadId || !content) {
    return res.status(400).json({ success: false, message: 'leadId and content are required' });
  }
  const note = await prisma.note.create({
    data: {
      content,
      leadId,
      authorId: req.user!.userId,
    },
    include: { author: { select: { id: true, firstName: true, lastName: true } } }
  });
  res.status(201).json({ success: true, data: note });
}));

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
