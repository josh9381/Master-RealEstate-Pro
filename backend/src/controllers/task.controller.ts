import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';
import type { TaskStatus, TaskPriority } from '@prisma/client';

/**
 * Get all tasks with filtering and pagination
 * GET /api/tasks
 */
export const getTasks = async (req: Request, res: Response) => {
  // Get validated query parameters
  const validatedQuery = (req as any).validatedQuery || req.query;
  const {
    page = 1,
    limit = 20,
    status,
    priority,
    assignedToId,
    leadId,
    overdue,
    search,
    sortBy = 'dueDate',
    sortOrder = 'asc',
  } = validatedQuery;

  // Build where clause
  const where: any = {};

  if (status) where.status = status as TaskStatus;
  if (priority) where.priority = priority as TaskPriority;
  if (assignedToId) where.assignedToId = assignedToId as string;
  if (leadId) where.leadId = leadId as string;

  // Filter overdue tasks
  if (overdue === 'true') {
    where.dueDate = { lt: new Date() };
    where.status = { in: ['PENDING', 'IN_PROGRESS'] };
  }

  // Search in title and description
  if (search) {
    where.OR = [
      { title: { contains: search as string } },
      { description: { contains: search as string } },
    ];
  }

  // Calculate pagination
  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  // Build orderBy
  const orderBy = {
    [sortBy as string]: sortOrder,
  };

  // Execute queries
  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      include: {
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
          },
        },
      },
      skip,
      take,
      orderBy,
    }),
    prisma.task.count({ where }),
  ]);

  // Add isOverdue flag
  const tasksWithOverdue = tasks.map(task => ({
    ...task,
    isOverdue: task.dueDate ? task.dueDate < new Date() && task.status !== 'COMPLETED' && task.status !== 'CANCELLED' : false,
  }));

  res.json({
    success: true,
    data: {
      tasks: tasksWithOverdue,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    },
  });
};

/**
 * Get single task by ID
 * GET /api/tasks/:id
 */
export const getTask = async (req: Request, res: Response) => {
  const { id } = req.params;

  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      assignedTo: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatar: true,
        },
      },
    },
  });

  if (!task) {
    throw new NotFoundError('Task not found');
  }

  // Add isOverdue flag
  const taskWithOverdue = {
    ...task,
    isOverdue: task.dueDate ? task.dueDate < new Date() && task.status !== 'COMPLETED' && task.status !== 'CANCELLED' : false,
  };

  res.json({
    success: true,
    data: { task: taskWithOverdue },
  });
};

/**
 * Create new task
 * POST /api/tasks
 */
export const createTask = async (req: Request, res: Response) => {
  const { title, description, dueDate, priority, status, assignedToId, leadId } = req.body;

  // Verify assigned user exists
  const assignedUser = await prisma.user.findUnique({
    where: { id: assignedToId },
  });

  if (!assignedUser) {
    throw new ValidationError('Assigned user not found');
  }

  // Verify lead exists if provided
  if (leadId) {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      throw new ValidationError('Lead not found');
    }
  }

  // Create the task
  const task = await prisma.task.create({
    data: {
      title,
      description: description || null,
      dueDate: new Date(dueDate),
      priority: priority || 'MEDIUM',
      status: status || 'PENDING',
      assignedToId,
      leadId: leadId || null,
    },
    include: {
      assignedTo: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatar: true,
        },
      },
    },
  });

  res.status(201).json({
    success: true,
    data: { task },
    message: 'Task created successfully',
  });
};

/**
 * Update task
 * PUT /api/tasks/:id
 */
export const updateTask = async (req: Request, res: Response) => {
  const { id } = req.params;
  const updateData = req.body;

  // Check if task exists
  const existingTask = await prisma.task.findUnique({
    where: { id },
  });

  if (!existingTask) {
    throw new NotFoundError('Task not found');
  }

  // Verify assigned user exists if changing assignment
  if (updateData.assignedToId) {
    const assignedUser = await prisma.user.findUnique({
      where: { id: updateData.assignedToId },
    });

    if (!assignedUser) {
      throw new ValidationError('Assigned user not found');
    }
  }

  // Verify lead exists if provided
  if (updateData.leadId) {
    const lead = await prisma.lead.findUnique({
      where: { id: updateData.leadId },
    });

    if (!lead) {
      throw new ValidationError('Lead not found');
    }
  }

  // Process date field
  const processedData: any = { ...updateData };
  if (updateData.dueDate !== undefined) {
    processedData.dueDate = new Date(updateData.dueDate);
  }

  // Auto-set completedAt when status changes to COMPLETED
  if (updateData.status === 'COMPLETED' && existingTask.status !== 'COMPLETED') {
    processedData.completedAt = new Date();
  }

  // Clear completedAt if status changes from COMPLETED to something else
  if (updateData.status && updateData.status !== 'COMPLETED' && existingTask.status === 'COMPLETED') {
    processedData.completedAt = null;
  }

  // Update the task
  const task = await prisma.task.update({
    where: { id },
    data: processedData,
    include: {
      assignedTo: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatar: true,
        },
      },
    },
  });

  res.json({
    success: true,
    data: { task },
    message: 'Task updated successfully',
  });
};

/**
 * Delete task
 * DELETE /api/tasks/:id
 */
export const deleteTask = async (req: Request, res: Response) => {
  const { id } = req.params;

  // Check if task exists
  const task = await prisma.task.findUnique({
    where: { id },
  });

  if (!task) {
    throw new NotFoundError('Task not found');
  }

  // Delete the task
  await prisma.task.delete({
    where: { id },
  });

  res.json({
    success: true,
    message: 'Task deleted successfully',
  });
};

/**
 * Mark task as complete
 * POST /api/tasks/:id/complete
 */
export const completeTask = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { completedAt } = req.body;

  // Check if task exists
  const existingTask = await prisma.task.findUnique({
    where: { id },
  });

  if (!existingTask) {
    throw new NotFoundError('Task not found');
  }

  // Update task status to completed
  const task = await prisma.task.update({
    where: { id },
    data: {
      status: 'COMPLETED',
      completedAt: completedAt ? new Date(completedAt) : new Date(),
    },
    include: {
      assignedTo: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatar: true,
        },
      },
    },
  });

  res.json({
    success: true,
    data: { task },
    message: 'Task marked as complete',
  });
};

/**
 * Get task statistics
 * GET /api/tasks/stats
 */
export const getTaskStats = async (req: Request, res: Response) => {
  const { assignedToId } = req.query;

  const where: any = assignedToId ? { assignedToId: assignedToId as string } : {};

  // Get task counts by status
  const byStatus = await prisma.task.groupBy({
    by: ['status'],
    _count: {
      id: true,
    },
    where,
  });

  // Get task counts by priority
  const byPriority = await prisma.task.groupBy({
    by: ['priority'],
    _count: {
      id: true,
    },
    where,
  });

  // Count overdue tasks
  const overdueCount = await prisma.task.count({
    where: {
      ...where,
      dueDate: { lt: new Date() },
      status: { in: ['PENDING', 'IN_PROGRESS'] },
    },
  });

  // Count due today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dueTodayCount = await prisma.task.count({
    where: {
      ...where,
      dueDate: {
        gte: today,
        lt: tomorrow,
      },
      status: { in: ['PENDING', 'IN_PROGRESS'] },
    },
  });

  // Get total count
  const total = await prisma.task.count({ where });

  res.json({
    success: true,
    data: {
      stats: {
        total,
        byStatus: byStatus.reduce((acc, item) => {
          acc[item.status] = item._count.id;
          return acc;
        }, {} as Record<string, number>),
        byPriority: byPriority.reduce((acc, item) => {
          acc[item.priority] = item._count.id;
          return acc;
        }, {} as Record<string, number>),
        overdue: overdueCount,
        dueToday: dueTodayCount,
      },
    },
  });
};

/**
 * Get tasks for a specific lead
 * GET /api/leads/:leadId/tasks
 */
export const getTasksForLead = async (req: Request, res: Response) => {
  const { leadId } = req.params;

  // Verify lead exists
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
  });

  if (!lead) {
    throw new NotFoundError('Lead not found');
  }

  // Get all tasks for the lead
  const tasks = await prisma.task.findMany({
    where: { leadId },
    include: {
      assignedTo: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
    orderBy: { dueDate: 'asc' },
  });

  res.json({
    success: true,
    data: { tasks },
  });
};

