import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { UnauthorizedError } from '../../middleware/errorHandler';
import { getUploadUrl, deleteUploadFile } from '../../config/upload';

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
        userId: req.user.userId,
        organizationId: req.user.organizationId
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
    industry,
    companySize,
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
      ...(industry !== undefined && { industry }),
      ...(companySize !== undefined && { companySize }),
      ...(address !== undefined && { address }),
      ...(phone !== undefined && { phone }),
      ...(website !== undefined && { website }),
      ...(logo !== undefined && { logo }),
      ...(billingEmail !== undefined && { billingEmail }),
      ...(businessHours && { businessHours })
    },
    create: {
      userId: req.user.userId,
      organizationId: req.user.organizationId,
      companyName,
      industry,
      companySize,
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

/**
 * Upload business logo
 * POST /api/settings/business/logo
 * Accepts multipart/form-data with field name 'logo'
 */
export async function uploadLogo(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const file = req.file;
  if (!file) {
    throw new Error('No file uploaded. Please select an image file (jpg, png, webp, gif, max 10 MB).');
  }

  const logoUrl = getUploadUrl(`logos/${file.filename}`);

  // Delete old logo file if it exists
  const currentSettings = await prisma.businessSettings.findUnique({
    where: { userId: req.user.userId },
    select: { logo: true },
  });
  if (currentSettings?.logo) {
    deleteUploadFile(currentSettings.logo);
  }

  const settings = await prisma.businessSettings.upsert({
    where: { userId: req.user.userId },
    update: { logo: logoUrl },
    create: {
      userId: req.user.userId,
      organizationId: req.user.organizationId,
      logo: logoUrl,
    },
  });

  res.status(200).json({
    success: true,
    message: 'Logo uploaded successfully',
    data: { logo: settings.logo }
  });
}
