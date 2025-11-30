import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/database';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { ConflictError, UnauthorizedError, NotFoundError } from '../middleware/errorHandler';

/**
 * Register a new user
 * POST /api/auth/register
 * Validation handled by middleware
 * Creates a new organization for the user (multi-tenant SaaS)
 */
export async function register(req: Request, res: Response): Promise<void> {
  const { firstName, lastName, email, password, companyName } = req.body;

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
        subscriptionTier: 'FREE',
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
        role: 'ADMIN' // First user in organization is admin
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
  const { email, password } = req.body;

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

  // Generate tokens with organizationId
  const accessToken = generateAccessToken(
    user.id,
    user.email,
    user.role,
    user.organizationId
  );
  const refreshToken = generateRefreshToken(user.id, user.organizationId);

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date(), lastLoginIp: req.ip }
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
 * Refresh access token
 * POST /api/auth/refresh
 * Validation handled by middleware
 */
export async function refresh(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body;

  // Verify refresh token (now includes organizationId)
  const payload = verifyRefreshToken(refreshToken);

  // Get user with organizationId
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      organizationId: true,
      email: true,
      role: true
    }
  });

  if (!user) {
    throw new UnauthorizedError('User not found');
  }

  // Verify organizationId matches
  if (user.organizationId !== payload.organizationId) {
    throw new UnauthorizedError('Organization mismatch');
  }

  // Generate new access token with organizationId
  const accessToken = generateAccessToken(
    user.id,
    user.email,
    user.role,
    user.organizationId
  );

  res.status(200).json({
    success: true,
    message: 'Token refreshed successfully',
    data: {
      accessToken
    }
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
