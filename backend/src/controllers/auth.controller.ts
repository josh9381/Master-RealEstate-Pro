import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/database';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { ConflictError, UnauthorizedError, NotFoundError } from '../middleware/errorHandler';

/**
 * Register a new user
 * POST /api/auth/register
 * Validation handled by middleware
 */
export async function register(req: Request, res: Response): Promise<void> {
  const { firstName, lastName, email, password } = req.body;

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    throw new ConflictError('User with this email already exists');
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user
  const user = await prisma.user.create({
    data: {
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role: 'USER' // Default role
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      avatar: true,
      createdAt: true
    }
  });

  // Generate tokens
  const accessToken = generateAccessToken(user.id, user.email, user.role);
  const refreshToken = generateRefreshToken(user.id);

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user,
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

  // Find user
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    throw new UnauthorizedError('Invalid credentials');
  }

  // Check password
  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new UnauthorizedError('Invalid credentials');
  }

  // Generate tokens
  const accessToken = generateAccessToken(user.id, user.email, user.role);
  const refreshToken = generateRefreshToken(user.id);

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
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      },
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

  // Verify refresh token
  const payload = verifyRefreshToken(refreshToken);

  // Get user
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      email: true,
      role: true
    }
  });

  if (!user) {
    throw new UnauthorizedError('User not found');
  }

  // Generate new access token
  const accessToken = generateAccessToken(user.id, user.email, user.role);

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

  // Get full user details
  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: {
      id: true,
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
