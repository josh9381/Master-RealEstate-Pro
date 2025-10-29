import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { UnauthorizedError } from '../../middleware/errorHandler';

/**
 * Get business settings
 * GET /api/settings/business
 */
export async function getBusinessSettings(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  let settings = await prisma.businessSettings.findUnique({
    where: { userId: req.user.userId }
  });

  // Create default settings if they don't exist
  if (!settings) {
    settings = await prisma.businessSettings.create({
      data: {
        userId: req.user.userId
      }
    });
  }

  res.status(200).json({
    success: true,
    data: { settings }
  });
}

/**
 * Update business settings
 * PUT /api/settings/business
 */
export async function updateBusinessSettings(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const {
    companyName,
    address,
    phone,
    website,
    logo,
    billingEmail,
    businessHours
  } = req.body;

  const settings = await prisma.businessSettings.upsert({
    where: { userId: req.user.userId },
    update: {
      ...(companyName !== undefined && { companyName }),
      ...(address !== undefined && { address }),
      ...(phone !== undefined && { phone }),
      ...(website !== undefined && { website }),
      ...(logo !== undefined && { logo }),
      ...(billingEmail !== undefined && { billingEmail }),
      ...(businessHours && { businessHours })
    },
    create: {
      userId: req.user.userId,
      companyName,
      address,
      phone,
      website,
      logo,
      billingEmail,
      businessHours
    }
  });

  res.status(200).json({
    success: true,
    message: 'Business settings updated successfully',
    data: { settings }
  });
}
