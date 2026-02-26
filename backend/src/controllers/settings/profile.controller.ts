import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../../config/database';
import { ConflictError, NotFoundError, UnauthorizedError } from '../../middleware/errorHandler';

/**
 * Get user profile
 * GET /api/settings/profile
 */
export async function getProfile(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      avatar: true,
      phone: true,
      jobTitle: true,
      company: true,
      address: true,
      role: true,
      timezone: true,
      language: true,
      subscriptionTier: true,
      createdAt: true,
      lastLoginAt: true
    }
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  res.status(200).json({
    success: true,
    data: { user }
  });
}

/**
 * Update user profile
 * PUT /api/settings/profile
 */
export async function updateProfile(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const { firstName, lastName, email, phone, jobTitle, company, address, timezone, language } = req.body;

  // If email is being updated, check if it's already taken
  if (email && email !== req.user.email) {
    const existingUser = await prisma.user.findUnique({
      where: { 
        organizationId_email: {
          organizationId: req.user!.organizationId,
          email
        }
      }
    });

    if (existingUser) {
      throw new ConflictError('Email already in use');
    }
  }

  // Update user
  const updatedUser = await prisma.user.update({
    where: { id: req.user.userId },
    data: {
      ...(firstName && { firstName }),
      ...(lastName && { lastName }),
      ...(email && { email }),
      ...(phone !== undefined && { phone: phone || null }),
      ...(jobTitle !== undefined && { jobTitle: jobTitle || null }),
      ...(company !== undefined && { company: company || null }),
      ...(address !== undefined && { address: address || null }),
      ...(timezone && { timezone }),
      ...(language && { language })
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      avatar: true,
      phone: true,
      jobTitle: true,
      company: true,
      address: true,
      role: true,
      timezone: true,
      language: true,
      updatedAt: true
    }
  });

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: { user: updatedUser }
  });
}

/**
 * Upload avatar
 * POST /api/settings/avatar
 */
export async function uploadAvatar(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  // TODO: Implement file upload to S3/Cloudflare R2
  // For now, we'll accept a base64 data URL or external URL
  
  const { avatar } = req.body;

  if (!avatar) {
    throw new Error('Avatar URL is required');
  }

  const updatedUser = await prisma.user.update({
    where: { id: req.user.userId },
    data: { avatar },
    select: {
      id: true,
      avatar: true
    }
  });

  res.status(200).json({
    success: true,
    message: 'Avatar updated successfully',
    data: { avatar: updatedUser.avatar }
  });
}

/**
 * Change password
 * PUT /api/settings/password
 */
export async function changePassword(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const { currentPassword, newPassword } = req.body;

  // Get user with password
  const user = await prisma.user.findUnique({
    where: { id: req.user.userId }
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Verify current password
  const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

  if (!isPasswordValid) {
    throw new UnauthorizedError('Current password is incorrect');
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Update password AND revoke all refresh tokens (force re-login on all devices) (#86)
  await prisma.$transaction([
    prisma.user.update({
      where: { id: req.user.userId },
      data: { password: hashedPassword },
    }),
    prisma.refreshToken.updateMany({
      where: { userId: req.user.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  res.status(200).json({
    success: true,
    message: 'Password changed successfully. Please log in again on all devices.'
  });
}
