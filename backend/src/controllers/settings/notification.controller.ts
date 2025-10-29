import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { UnauthorizedError } from '../../middleware/errorHandler';

/**
 * Get notification settings
 * GET /api/settings/notifications
 */
export async function getNotificationSettings(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  let settings = await prisma.notificationSettings.findUnique({
    where: { userId: req.user.userId }
  });

  // Create default settings if they don't exist
  if (!settings) {
    settings = await prisma.notificationSettings.create({
      data: {
        userId: req.user.userId,
        emailNotifications: true,
        pushNotifications: true,
        smsNotifications: false
      }
    });
  }

  res.status(200).json({
    success: true,
    data: { settings }
  });
}

/**
 * Update notification settings
 * PUT /api/settings/notifications
 */
export async function updateNotificationSettings(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const {
    emailNotifications,
    pushNotifications,
    smsNotifications,
    channels
  } = req.body;

  const settings = await prisma.notificationSettings.upsert({
    where: { userId: req.user.userId },
    update: {
      ...(emailNotifications !== undefined && { emailNotifications }),
      ...(pushNotifications !== undefined && { pushNotifications }),
      ...(smsNotifications !== undefined && { smsNotifications }),
      ...(channels && { channels })
    },
    create: {
      userId: req.user.userId,
      emailNotifications: emailNotifications ?? true,
      pushNotifications: pushNotifications ?? true,
      smsNotifications: smsNotifications ?? false,
      channels
    }
  });

  res.status(200).json({
    success: true,
    message: 'Notification settings updated successfully',
    data: { settings }
  });
}
