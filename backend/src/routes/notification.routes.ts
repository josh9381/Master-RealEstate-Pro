import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { validateBody, validateParams } from '../middleware/validate';
import { createNotificationSchema, notificationIdParamSchema } from '../validators/notification.validator';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createNotification,
  getUnreadCount
} from '../controllers/notification.controller';

const router = Router();

// All notification routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/notifications/unread-count
 * @desc    Get unread notification count
 * @access  Private
 */
router.get('/unread-count', asyncHandler(getUnreadCount));

/**
 * @route   GET /api/notifications
 * @desc    Get user notifications
 * @access  Private
 */
router.get('/', asyncHandler(getNotifications));

/**
 * @route   POST /api/notifications
 * @desc    Create notification
 * @access  Private
 */
router.post('/', validateBody(createNotificationSchema), asyncHandler(createNotification));

/**
 * @route   PATCH /api/notifications/mark-all-read
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.patch('/mark-all-read', asyncHandler(markAllAsRead));

/**
 * @route   PATCH /api/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.patch('/:id/read', validateParams(notificationIdParamSchema), asyncHandler(markAsRead));

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Delete notification
 * @access  Private
 */
router.delete('/:id', validateParams(notificationIdParamSchema), asyncHandler(deleteNotification));

export default router;
