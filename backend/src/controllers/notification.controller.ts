import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { UnauthorizedError } from '../middleware/errorHandler';
import { pushNotification } from '../config/socket';

/**
 * Get user notifications
 * GET /api/notifications
 */
export async function getNotifications(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const { page = 1, limit = 20, read } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const where: {
    userId: string;
    organizationId: string;
    read?: boolean;
  } = {
    userId: req.user.userId,
    organizationId: req.user.organizationId
  };

  // Filter by read status if provided
  if (read !== undefined) {
    where.read = read === 'true';
  }

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: Number(limit)
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({
      where: {
        userId: req.user.userId,
        organizationId: req.user.organizationId,
        read: false
      }
    })
  ]);

  res.status(200).json({
    success: true,
    data: {
      notifications,
      unreadCount,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    }
  });
}

/**
 * Mark notification as read
 * PATCH /api/notifications/:id/read
 */
export async function markAsRead(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const { id } = req.params;

  const notification = await prisma.notification.update({
    where: {
      id,
      userId: req.user.userId,
      organizationId: req.user.organizationId
    },
    data: { read: true }
  });

  res.status(200).json({
    success: true,
    data: { notification }
  });
}

/**
 * Mark all notifications as read
 * PATCH /api/notifications/mark-all-read
 */
export async function markAllAsRead(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  await prisma.notification.updateMany({
    where: {
      userId: req.user.userId,
      organizationId: req.user.organizationId,
      read: false
    },
    data: { read: true }
  });

  res.status(200).json({
    success: true,
    message: 'All notifications marked as read'
  });
}

/**
 * Delete notification
 * DELETE /api/notifications/:id
 */
export async function deleteNotification(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const { id } = req.params;

  await prisma.notification.delete({
    where: {
      id,
      userId: req.user.userId,
      organizationId: req.user.organizationId
    }
  });

  res.status(200).json({
    success: true,
    message: 'Notification deleted'
  });
}

/**
 * Create notification (for internal use or API)
 * POST /api/notifications
 */
export async function createNotification(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const { type, title, message, link, userId } = req.body;

  const notification = await prisma.notification.create({
    data: {
      userId: userId || req.user.userId,
      organizationId: req.user.organizationId,
      type,
      title,
      message,
      link
    }
  });

  // Push real-time notification via Socket.io
  pushNotification(notification.userId, {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    read: false,
    createdAt: notification.createdAt.toISOString(),
    data: link ? { link } : undefined,
  });

  res.status(201).json({
    success: true,
    data: { notification }
  });
}

/**
 * Get unread notification count
 * GET /api/notifications/unread-count
 */
export async function getUnreadCount(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const count = await prisma.notification.count({
    where: {
      userId: req.user.userId,
      organizationId: req.user.organizationId,
      read: false
    }
  });

  res.status(200).json({
    success: true,
    data: { count }
  });
}
