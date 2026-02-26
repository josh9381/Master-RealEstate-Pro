import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../../config/database';
import { UnauthorizedError, NotFoundError } from '../../middleware/errorHandler';
import { generate2FASecret, generateQRCode, verify2FAToken } from '../../utils/2fa';

/**
 * Get security settings
 * GET /api/settings/security
 */
export async function getSecuritySettings(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: {
      twoFactorEnabled: true,
      lastLoginAt: true,
      lastLoginIp: true,
      emailVerified: true,
      updatedAt: true,
      createdAt: true,
    }
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Compute security score from actual settings (0–100)
  let securityScore = 30; // Base score for having an account
  if (user.twoFactorEnabled) securityScore += 30; // 2FA is the biggest factor
  if (user.emailVerified) securityScore += 15;
  if (user.lastLoginAt) {
    // Recent login within 7 days = good sign
    const daysSinceLogin = (Date.now() - new Date(user.lastLoginAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceLogin < 7) securityScore += 10;
  }
  // Password age check: if account was updated recently (could imply password change)
  const daysSinceUpdate = (Date.now() - new Date(user.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceUpdate < 90) securityScore += 15; // Updated within 90 days

  res.status(200).json({
    success: true,
    data: {
      twoFactorEnabled: user.twoFactorEnabled,
      emailVerified: user.emailVerified,
      securityScore: Math.min(securityScore, 100),
      lastLogin: {
        at: user.lastLoginAt,
        ip: user.lastLoginIp
      }
    }
  });
}

/**
 * Enable 2FA - Generate secret and QR code
 * POST /api/settings/2fa/enable
 */
export async function enable2FA(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.userId }
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  if (user.twoFactorEnabled) {
    throw new Error('2FA is already enabled');
  }

  // Generate 2FA secret
  const { secret, otpauthUrl } = generate2FASecret(user.email);

  // Generate QR code
  const qrCode = otpauthUrl ? await generateQRCode(otpauthUrl) : null;

  // Return secret and QR code (don't save to DB yet - user must verify first)
  res.status(200).json({
    success: true,
    message: 'Scan the QR code with your authenticator app, then verify with a code',
    data: {
      secret, // User needs this as backup
      qrCode, // Data URL for QR code image
      otpauthUrl
    }
  });
}

/**
 * Verify 2FA code and confirm enabling
 * POST /api/settings/2fa/verify
 */
export async function verify2FA(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const { token, secret } = req.body;

  if (!secret) {
    throw new Error('Secret is required for verification');
  }

  // Verify the token
  const isValid = verify2FAToken(token, secret);

  if (!isValid) {
    throw new UnauthorizedError('Invalid 2FA code');
  }

  // Token is valid - save the secret and enable 2FA
  await prisma.user.update({
    where: { id: req.user.userId },
    data: {
      twoFactorEnabled: true,
      twoFactorSecret: secret
    }
  });

  res.status(200).json({
    success: true,
    message: '2FA enabled successfully'
  });
}

/**
 * Disable 2FA
 * POST /api/settings/2fa/disable
 */
export async function disable2FA(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const { password, token } = req.body;

  // Get user with password and 2FA secret
  const user = await prisma.user.findUnique({
    where: { id: req.user.userId }
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  if (!user.twoFactorEnabled) {
    throw new Error('2FA is not enabled');
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new UnauthorizedError('Invalid password');
  }

  // Verify 2FA token
  const isTokenValid = verify2FAToken(token, user.twoFactorSecret!);

  if (!isTokenValid) {
    throw new UnauthorizedError('Invalid 2FA code');
  }

  // Disable 2FA
  await prisma.user.update({
    where: { id: req.user.userId },
    data: {
      twoFactorEnabled: false,
      twoFactorSecret: null
    }
  });

  res.status(200).json({
    success: true,
    message: '2FA disabled successfully'
  });
}
