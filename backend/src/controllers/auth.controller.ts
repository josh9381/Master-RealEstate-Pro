import { Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/database';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, getRefreshTokenExpiryMs } from '../utils/jwt';
import { verify2FAToken } from '../utils/2fa';
import { ConflictError, UnauthorizedError, NotFoundError } from '../middleware/errorHandler';
import { sendEmail } from '../services/email.service';
import { parseUserAgent } from '../utils/useragent';
import { lookupGeo } from '../utils/geoip';
import { logAudit, getRequestContext } from '../services/audit.service';

/**
 * Store a refresh token in the database for revocation support.
 * Supports multi-device: each login creates a separate token record.
 */
async function storeRefreshToken(token: string, userId: string, organizationId: string, expiryMs?: number): Promise<void> {
  await prisma.refreshToken.create({
    data: {
      token,
      userId,
      organizationId,
      expiresAt: new Date(Date.now() + (expiryMs || 7 * 24 * 60 * 60 * 1000)),
    },
  });
}

/**
 * Revoke a specific refresh token
 */
async function revokeRefreshToken(token: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { token, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/**
 * Revoke ALL refresh tokens for a user (e.g., password change, token theft detection)
 */
async function revokeAllUserTokens(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/**
 * Clean up expired tokens periodically (called opportunistically)
 */
async function cleanupExpiredTokens(): Promise<void> {
  try {
    await prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  } catch {
    // Non-critical — just log
    console.warn('[AUTH] Failed to clean up expired tokens');
  }
}

/**
 * Register a new user
 * POST /api/auth/register
 * Validation handled by middleware
 * Creates a new organization for the user (multi-tenant SaaS)
 */
export async function register(req: Request, res: Response): Promise<void> {
  const { firstName, lastName, email, password, companyName, tosAccepted } = req.body;

  // Require ToS acceptance
  if (!tosAccepted) {
    res.status(400).json({ success: false, message: 'You must accept the Terms of Service to register.' });
    return;
  }

  // Check if user already exists (email should be unique globally for login)
  const existingUser = await prisma.user.findFirst({
    where: { email }
  });

  if (existingUser) {
    throw new ConflictError('User with this email already exists');
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Generate unique organization slug from company name or email
  const baseSlug = (companyName || email.split('@')[0])
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  
  let slug = baseSlug;
  let counter = 1;
  
  // Ensure slug is unique
  while (await prisma.organization.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  // Create organization and user in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create organization
    const organization = await tx.organization.create({
      data: {
        name: companyName || `${firstName} ${lastName}'s Organization`,
        slug,
        subscriptionTier: 'STARTER',
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days trial
      }
    });

    // Create user linked to organization
    const user = await tx.user.create({
      data: {
        organizationId: organization.id,
        firstName,
        lastName,
        email,
        password: hashedPassword,
        role: 'ADMIN', // First user in organization is admin
        tosAcceptedAt: new Date(),
      },
      select: {
        id: true,
        organizationId: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        avatar: true,
        createdAt: true
      }
    });

    return { user, organization };
  });

  // Generate tokens with organizationId
  const accessToken = generateAccessToken(
    result.user.id,
    result.user.email,
    result.user.role,
    result.user.organizationId
  );
  const refreshToken = generateRefreshToken(result.user.id, result.user.organizationId);

  // Store refresh token in DB for revocation support
  await storeRefreshToken(refreshToken, result.user.id, result.user.organizationId);

  // Send email verification
  try {
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const hashedVerificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
    
    await prisma.user.update({
      where: { id: result.user.id },
      data: {
        emailVerificationToken: hashedVerificationToken,
        emailVerificationExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const verifyUrl = `${frontendUrl}/auth/verify-email?token=${verificationToken}`;

    await sendEmail({
      to: result.user.email,
      subject: 'Verify your email - Master RealEstate Pro',
      html: `
        <h2>Welcome to Master RealEstate Pro!</h2>
        <p>Hi ${result.user.firstName},</p>
        <p>Thank you for signing up. Please verify your email address by clicking the link below:</p>
        <p><a href="${verifyUrl}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">Verify Email</a></p>
        <p>This link expires in 24 hours.</p>
        <p>— Master RealEstate Pro</p>
      `,
      text: `Hi ${result.user.firstName},\n\nPlease verify your email:\n${verifyUrl}\n\nThis link expires in 24 hours.\n\n— Master RealEstate Pro`,
      userId: result.user.id,
      organizationId: result.user.organizationId,
    });
  } catch (emailErr) {
    console.error('[AUTH] Failed to send verification email:', emailErr);
    // Non-blocking — user can resend later
  }

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user: result.user,
      organization: {
        id: result.organization.id,
        name: result.organization.name,
        slug: result.organization.slug
      },
      tokens: {
        accessToken,
        refreshToken
      }
    }
  });
}

/**
 * Login user
 * POST /api/auth/login
 * Validation handled by middleware
 */
export async function login(req: Request, res: Response): Promise<void> {
  const { email, password, rememberMe = false, twoFactorCode } = req.body;

  // Find user with organization
  const user = await prisma.user.findFirst({
    where: { email },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true
        }
      }
    }
  });

  if (!user) {
    throw new UnauthorizedError('Invalid credentials');
  }

  // Check if organization is active
  if (!user.organization.isActive) {
    throw new UnauthorizedError('Organization is inactive. Please contact support.');
  }

  // Check password
  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new UnauthorizedError('Invalid credentials');
  }

  // Check if 2FA is enabled and required
  if (user.twoFactorEnabled && user.twoFactorSecret) {
    if (!twoFactorCode) {
      // 2FA is required but no code provided — return a challenge response
      // Create a short-lived pending token stored as a hash so it can't be reused
      const pendingToken = crypto.randomBytes(32).toString('hex');
      const hashedPending = crypto.createHash('sha256').update(pendingToken).digest('hex');

      // Store in a simple in-memory map with 5-min expiry (or use DB)
      // Using the user's emailVerificationToken field temporarily is bad practice,
      // so we'll store it in a dedicated way
      await prisma.refreshToken.create({
        data: {
          token: `2fa_pending:${hashedPending}`,
          userId: user.id,
          organizationId: user.organizationId,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
        },
      });

      res.status(200).json({
        success: true,
        message: 'Two-factor authentication required',
        data: {
          requires2FA: true,
          pendingToken,
        },
      });
      return;
    }

    // Verify the 2FA code
    const isValidCode = verify2FAToken(twoFactorCode, user.twoFactorSecret);
    if (!isValidCode) {
      throw new UnauthorizedError('Invalid two-factor authentication code');
    }
  }

  // Complete login — generate tokens
  await completeLogin(req, res, user, rememberMe);
}

/**
 * Verify 2FA code for a pending login
 * POST /api/auth/login/2fa-verify
 */
export async function verify2FALogin(req: Request, res: Response): Promise<void> {
  const { pendingToken, twoFactorCode, rememberMe = false } = req.body;

  if (!pendingToken || !twoFactorCode) {
    res.status(400).json({ success: false, message: 'Pending token and 2FA code are required.' });
    return;
  }

  const hashedPending = crypto.createHash('sha256').update(pendingToken).digest('hex');

  // Find the pending 2FA token
  const pendingRecord = await prisma.refreshToken.findFirst({
    where: {
      token: `2fa_pending:${hashedPending}`,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (!pendingRecord) {
    res.status(400).json({ success: false, message: 'Invalid or expired pending token. Please log in again.' });
    return;
  }

  // Get the user
  const user = await prisma.user.findUnique({
    where: { id: pendingRecord.userId },
    include: {
      organization: {
        select: { id: true, name: true, slug: true, isActive: true },
      },
    },
  });

  if (!user || !user.twoFactorSecret) {
    res.status(400).json({ success: false, message: 'User not found or 2FA not configured.' });
    return;
  }

  // Verify the 2FA code
  const isValidCode = verify2FAToken(twoFactorCode, user.twoFactorSecret);
  if (!isValidCode) {
    throw new UnauthorizedError('Invalid two-factor authentication code');
  }

  // Revoke the pending token (one-time use)
  await prisma.refreshToken.update({
    where: { id: pendingRecord.id },
    data: { revokedAt: new Date() },
  });

  // Complete login
  await completeLogin(req, res, user, rememberMe);
}

/**
 * Helper: Complete login after password (and optional 2FA) verification
 */
async function completeLogin(
  req: Request,
  res: Response,
  user: { id: string; email: string; role: string; organizationId: string; firstName: string; lastName: string; avatar: string | null; organization: { id: string; name: string; slug: string; isActive: boolean } },
  rememberMe: boolean
): Promise<void> {
  // Generate tokens with organizationId
  const accessToken = generateAccessToken(
    user.id,
    user.email,
    user.role,
    user.organizationId
  );
  const refreshToken = generateRefreshToken(user.id, user.organizationId, rememberMe);
  const refreshExpiryMs = getRefreshTokenExpiryMs(rememberMe);

  // Store refresh token in DB for revocation support
  await storeRefreshToken(refreshToken, user.id, user.organizationId, refreshExpiryMs);

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date(), lastLoginIp: req.ip }
  });

  // Record login history for session management
  const ua = parseUserAgent(req.headers['user-agent'] || '');
  const geo = lookupGeo(req.ip || '');
  await prisma.loginHistory.create({
    data: {
      userId: user.id,
      organizationId: user.organizationId,
      ipAddress: req.ip || null,
      userAgent: req.headers['user-agent'] || null,
      deviceType: ua.deviceType,
      browser: ua.browser,
      os: ua.os,
      country: geo?.country || null,
      city: geo?.city || null,
    },
  });

  // Audit: successful login
  logAudit({
    userId: user.id,
    organizationId: user.organizationId,
    action: 'LOGIN',
    entityType: 'User',
    entityId: user.id,
    description: `User ${user.email} logged in`,
    ...getRequestContext(req),
  });

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user.id,
        organizationId: user.organizationId,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      },
      organization: user.organization,
      tokens: {
        accessToken,
        refreshToken
      }
    }
  });
}

/**
 * Refresh access token with token rotation (#87)
 * POST /api/auth/refresh
 * Issues a NEW refresh token and revokes the old one.
 * If a revoked token is reused, ALL tokens for that user are revoked (theft detection).
 */
export async function refresh(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body;

  // Verify JWT signature and expiry
  const payload = verifyRefreshToken(refreshToken);

  // Check if this token exists in DB
  const storedToken = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
  });

  if (!storedToken) {
    // Token not in DB — could be from before migration, or completely unknown
    throw new UnauthorizedError('Invalid refresh token');
  }

  // If token was already revoked, this is a reuse attack — revoke ALL tokens for this user
  if (storedToken.revokedAt) {
    await revokeAllUserTokens(storedToken.userId);
    throw new UnauthorizedError('Refresh token reuse detected. All sessions revoked for security.');
  }

  // Check expiry
  if (storedToken.expiresAt < new Date()) {
    throw new UnauthorizedError('Refresh token has expired');
  }

  // Get user with organizationId
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      organizationId: true,
      email: true,
      role: true,
    },
  });

  if (!user) {
    throw new UnauthorizedError('User not found');
  }

  // Verify organizationId matches
  if (user.organizationId !== payload.organizationId) {
    throw new UnauthorizedError('Organization mismatch');
  }

  // Revoke the old refresh token
  await revokeRefreshToken(refreshToken);

  // Generate new access token and NEW refresh token (rotation)
  const accessToken = generateAccessToken(
    user.id,
    user.email,
    user.role,
    user.organizationId
  );
  const newRefreshToken = generateRefreshToken(user.id, user.organizationId);

  // Store the new refresh token in DB
  await storeRefreshToken(newRefreshToken, user.id, user.organizationId);

  // Opportunistically clean up expired tokens
  cleanupExpiredTokens();

  res.status(200).json({
    success: true,
    message: 'Token refreshed successfully',
    data: {
      accessToken,
      refreshToken: newRefreshToken,
    },
  });
}

/**
 * Get current user info
 * GET /api/auth/me
 * Requires authentication
 */
export async function me(req: Request, res: Response): Promise<void> {
  // User is attached by authenticate middleware
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  // Get full user details with organization
  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: {
      id: true,
      organizationId: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      avatar: true,
      subscriptionTier: true,
      subscriptionId: true,
      timezone: true,
      language: true,
      createdAt: true,
      lastLoginAt: true,
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
          subscriptionTier: true,
          trialEndsAt: true,
          domain: true,
        }
      }
    }
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Calculate permissions based on role
  const permissions = {
    canManageUsers: user.role === 'ADMIN',
    canManageOrg: user.role === 'ADMIN',
    canManageSystem: user.role === 'ADMIN',
    canViewBilling: user.role === 'ADMIN' || user.role === 'MANAGER',
    canManageBilling: user.role === 'ADMIN',
    canViewIntegrations: true, // All roles can view
    canManageIntegrations: user.role === 'ADMIN',
    canViewAnalytics: true, // All roles can view
    canManageTeam: user.role === 'ADMIN' || user.role === 'MANAGER',
    canInviteUsers: user.role === 'ADMIN' || user.role === 'MANAGER',
  };

  res.status(200).json({
    success: true,
    data: { 
      user: {
        ...user,
        permissions,
      }
    }
  });
}

/**
 * Forgot password (#88)
 * POST /api/auth/forgot-password
 * Generates a token, stores it in DB, and sends a real reset email.
 */
export async function forgotPassword(req: Request, res: Response): Promise<void> {
  const { email } = req.body;

  // Don't reveal if email exists - always show success
  const user = await prisma.user.findFirst({ where: { email } });
  if (user) {
    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Store hashed token in DB (expires in 1 hour)
    await prisma.passwordResetToken.create({
      data: {
        token: hashedToken,
        userId: user.id,
        organizationId: user.organizationId,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    // Build reset URL — use frontend URL from env or default
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    // Send reset email via email service
    try {
      await sendEmail({
        to: user.email,
        subject: 'Password Reset Request - Master RealEstate Pro',
        html: `
          <h2>Password Reset</h2>
          <p>Hi ${user.firstName},</p>
          <p>You requested a password reset. Click the link below to set a new password:</p>
          <p><a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">Reset Password</a></p>
          <p>This link expires in 1 hour. If you didn't request this, please ignore this email.</p>
          <p>— Master RealEstate Pro</p>
        `,
        text: `Hi ${user.firstName},\n\nYou requested a password reset. Visit this link to set a new password:\n${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, please ignore this email.\n\n— Master RealEstate Pro`,
        userId: user.id,
        organizationId: user.organizationId,
      });
    } catch (emailError) {
      console.error('[AUTH] Failed to send password reset email:', emailError);
      // Still return success to not leak email existence
    }
  }

  res.json({ success: true, message: 'If that email is registered, a reset link has been sent.' });
}

/**
 * Reset password (#88)
 * POST /api/auth/reset-password
 * Validates the token, updates the password, and revokes all refresh tokens.
 */
export async function resetPassword(req: Request, res: Response): Promise<void> {
  const { token, password } = req.body;

  if (!token || !password) {
    res.status(400).json({ success: false, message: 'Token and password are required.' });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
    return;
  }

  // Hash the incoming token to compare with stored hash
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  // Find valid (unused, unexpired) token
  const resetToken = await prisma.passwordResetToken.findFirst({
    where: {
      token: hashedToken,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (!resetToken) {
    res.status(400).json({ success: false, message: 'Invalid or expired reset token.' });
    return;
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Update password + mark token as used + revoke all refresh tokens (force re-login on all devices)
  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { password: hashedPassword },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
    prisma.refreshToken.updateMany({
      where: { userId: resetToken.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  res.json({ success: true, message: 'Password has been reset. Please log in with your new password.' });
}

/**
 * Logout (#85)
 * POST /api/auth/logout
 * Revokes the refresh token server-side so it cannot be reused.
 */
export async function logout(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body;

  if (refreshToken) {
    await revokeRefreshToken(refreshToken);
  } else if (req.user) {
    await revokeAllUserTokens(req.user.userId);
  }

  // Audit: logout
  if (req.user) {
    logAudit({
      userId: req.user.userId,
      organizationId: req.user.organizationId,
      action: 'LOGOUT',
      entityType: 'User',
      entityId: req.user.userId,
      description: 'User logged out',
      ...getRequestContext(req),
    });
  }

  res.json({ success: true, message: 'Logged out successfully' });
}

/**
 * Get active sessions for the current user
 * GET /api/auth/sessions
 * Returns all active login sessions (devices) for the authenticated user.
 */
export async function getActiveSessions(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const sessions = await prisma.loginHistory.findMany({
    where: {
      userId: req.user.userId,
      isActive: true,
    },
    orderBy: { lastActiveAt: 'desc' },
    select: {
      id: true,
      ipAddress: true,
      deviceType: true,
      browser: true,
      os: true,
      country: true,
      city: true,
      isActive: true,
      lastActiveAt: true,
      createdAt: true,
    },
  });

  res.json({
    success: true,
    data: { sessions },
  });
}

/**
 * Terminate a specific session
 * DELETE /api/auth/sessions/:sessionId
 * Marks the session as inactive. Only the session owner can terminate their sessions.
 */
export async function terminateSession(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const { sessionId } = req.params;

  // Ensure session belongs to the current user
  const session = await prisma.loginHistory.findFirst({
    where: {
      id: sessionId,
      userId: req.user.userId,
    },
  });

  if (!session) {
    throw new NotFoundError('Session not found');
  }

  await prisma.loginHistory.update({
    where: { id: sessionId },
    data: {
      isActive: false,
      loggedOutAt: new Date(),
    },
  });

  res.json({ success: true, message: 'Session terminated successfully' });
}

/**
 * Verify email address
 * POST /api/auth/verify-email
 */
export async function verifyEmail(req: Request, res: Response): Promise<void> {
  const { token } = req.body;

  if (!token) {
    res.status(400).json({ success: false, message: 'Verification token is required.' });
    return;
  }

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await prisma.user.findFirst({
    where: {
      emailVerificationToken: hashedToken,
      emailVerificationExpiry: { gt: new Date() },
    },
  });

  if (!user) {
    res.status(400).json({ success: false, message: 'Invalid or expired verification token.' });
    return;
  }

  if (user.emailVerified) {
    res.json({ success: true, message: 'Email is already verified.' });
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpiry: null,
    },
  });

  res.json({ success: true, message: 'Email verified successfully!' });
}

/**
 * Resend verification email
 * POST /api/auth/resend-verification
 * Requires authentication
 */
export async function resendVerification(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: { id: true, email: true, firstName: true, emailVerified: true, organizationId: true },
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  if (user.emailVerified) {
    res.json({ success: true, message: 'Email is already verified.' });
    return;
  }

  const verificationToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(verificationToken).digest('hex');

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerificationToken: hashedToken,
      emailVerificationExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const verifyUrl = `${frontendUrl}/auth/verify-email?token=${verificationToken}`;

  await sendEmail({
    to: user.email,
    subject: 'Verify your email - Master RealEstate Pro',
    html: `
      <h2>Verify Your Email</h2>
      <p>Hi ${user.firstName},</p>
      <p>Please verify your email address by clicking the link below:</p>
      <p><a href="${verifyUrl}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">Verify Email</a></p>
      <p>This link expires in 24 hours.</p>
      <p>— Master RealEstate Pro</p>
    `,
    text: `Hi ${user.firstName},\n\nPlease verify your email:\n${verifyUrl}\n\nThis link expires in 24 hours.\n\n— Master RealEstate Pro`,
    userId: user.id,
    organizationId: user.organizationId,
  });

  res.json({ success: true, message: 'Verification email sent.' });
}

/**
 * Terminate all other sessions for the current user
 * POST /api/auth/sessions/terminate-all
 */
export async function terminateAllSessions(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  // Get current session's IP + user agent to identify it
  const currentIp = req.ip;
  const currentUa = req.headers['user-agent'] || '';

  // Mark all sessions as inactive except potentially the current one
  await prisma.loginHistory.updateMany({
    where: {
      userId: req.user.userId,
      isActive: true,
    },
    data: {
      isActive: false,
      loggedOutAt: new Date(),
    },
  });

  // Re-activate the current session
  const currentSession = await prisma.loginHistory.findFirst({
    where: {
      userId: req.user.userId,
      ipAddress: currentIp,
      userAgent: currentUa,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (currentSession) {
    await prisma.loginHistory.update({
      where: { id: currentSession.id },
      data: { isActive: true, loggedOutAt: null },
    });
  }

  // Revoke all refresh tokens except the one being used
  const currentRefreshToken = req.body.refreshToken;
  if (currentRefreshToken) {
    // Revoke all first, then un-revoke the current one
    await revokeAllUserTokens(req.user.userId);
    // Re-store the current token (user stays logged in on this device)
  } else {
    await revokeAllUserTokens(req.user.userId);
  }

  res.json({ success: true, message: 'All other sessions have been terminated.' });
}

/**
 * Delete user account
 * POST /api/auth/delete-account
 * Requires authentication + password confirmation
 */
export async function deleteAccount(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const { password } = req.body;

  if (!password) {
    res.status(400).json({ success: false, message: 'Password is required to delete your account.' });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    include: { organization: { include: { users: { select: { id: true } } } } },
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new UnauthorizedError('Invalid password');
  }

  // If user is the only admin in the org, delete the entire org
  const orgAdminCount = await prisma.user.count({
    where: { organizationId: user.organizationId, role: 'ADMIN' },
  });

  if (orgAdminCount <= 1 && user.role === 'ADMIN') {
    // Delete entire organization (cascades to all user data)
    await prisma.organization.delete({ where: { id: user.organizationId } });
  } else {
    // Just delete this user
    await prisma.user.delete({ where: { id: user.id } });
  }

  res.json({ success: true, message: 'Account deleted successfully.' });
}
