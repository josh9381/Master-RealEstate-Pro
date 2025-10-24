import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middleware/auth';
import { validateBody, validateParams, validateQuery } from '../middleware/validate';
import {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  completeTask,
  getTaskStats,
} from '../controllers/task.controller';
import {
  createTaskSchema,
  updateTaskSchema,
  taskIdSchema,
  listTasksQuerySchema,
  completeTaskSchema,
} from '../validators/task.validator';
import { sensitiveLimiter } from '../middleware/rateLimiter';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/tasks/stats
 * @desc    Get task statistics
 * @access  Private
 */
router.get('/stats', asyncHandler(getTaskStats));

/**
 * @route   GET /api/tasks
 * @desc    Get all tasks with filtering and pagination
 * @access  Private
 */
router.get(
  '/',
  validateQuery(listTasksQuerySchema),
  asyncHandler(getTasks)
);

/**
 * @route   GET /api/tasks/:id
 * @desc    Get a single task by ID
 * @access  Private
 */
router.get(
  '/:id',
  validateParams(taskIdSchema),
  asyncHandler(getTask)
);

/**
 * @route   POST /api/tasks
 * @desc    Create a new task
 * @access  Private
 */
router.post(
  '/',
  validateBody(createTaskSchema),
  sensitiveLimiter,
  asyncHandler(createTask)
);

/**
 * @route   POST /api/tasks/:id/complete
 * @desc    Mark task as complete
 * @access  Private
 */
router.post(
  '/:id/complete',
  validateParams(taskIdSchema),
  validateBody(completeTaskSchema),
  asyncHandler(completeTask)
);

/**
 * @route   PUT /api/tasks/:id
 * @desc    Update a task
 * @access  Private
 */
router.put(
  '/:id',
  validateParams(taskIdSchema),
  validateBody(updateTaskSchema),
  asyncHandler(updateTask)
);

/**
 * @route   DELETE /api/tasks/:id
 * @desc    Delete a task
 * @access  Private
 */
router.delete(
  '/:id',
  validateParams(taskIdSchema),
  sensitiveLimiter,
  asyncHandler(deleteTask)
);

export default router;
