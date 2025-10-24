import { z } from 'zod';

/**
 * Task priority enum
 */
const taskPrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);

/**
 * Task status enum
 */
const taskStatusSchema = z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']);

/**
 * Create task validation schema
 */
export const createTaskSchema = z.object({
  title: z.string().min(1, 'Task title is required').max(255),
  description: z.string().max(5000).optional(),
  dueDate: z.string().datetime('Invalid date format'),
  priority: taskPrioritySchema.optional(),
  status: taskStatusSchema.optional(),
  assignedToId: z.string().min(1, 'Assigned user ID is required'),
  leadId: z.string().optional().nullable(),
});

/**
 * Update task validation schema
 */
export const updateTaskSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).optional().nullable(),
  dueDate: z.string().datetime().optional(),
  priority: taskPrioritySchema.optional(),
  status: taskStatusSchema.optional(),
  assignedToId: z.string().optional(),
  leadId: z.string().optional().nullable(),
});

/**
 * Task ID parameter validation
 */
export const taskIdSchema = z.object({
  id: z.string().min(1, 'Task ID is required'),
});

/**
 * List tasks query validation
 */
export const listTasksQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).optional().default('1').transform(Number),
  limit: z.string().regex(/^\d+$/).optional().default('20').transform(Number),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  assignedToId: z.string().optional(),
  leadId: z.string().optional(),
  overdue: z.string().optional(), // 'true' or 'false'
  search: z.string().optional(), // Search in title, description
  sortBy: z.enum(['createdAt', 'updatedAt', 'dueDate', 'priority', 'title']).optional().default('dueDate'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});

/**
 * Complete task validation
 */
export const completeTaskSchema = z.object({
  completedAt: z.string().datetime().optional(),
});
