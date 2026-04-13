import { logger } from '../lib/logger'
import jwt from "jsonwebtoken";
import { UnauthorizedError } from "../middleware/errorHandler";
import { getRedisClient } from '../config/redis';

// JWT configuration - Validate secrets at startup
const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET;

// Validate JWT secrets are configured
if (!ACCESS_TOKEN_SECRET || !REFRESH_TOKEN_SECRET) {
  logger.error('❌ FATAL: JWT secrets are not configured!');
  logger.error('Please set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET in your .env file');
  logger.error('Generate strong secrets with: node -e "logger.info(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  process.exit(1);
}

// Validate secret strength (minimum 32 characters for 256-bit security)
if (ACCESS_TOKEN_SECRET.length < 32) {
  logger.error('❌ FATAL: JWT_ACCESS_SECRET must be at least 32 characters (256-bit)');
  logger.error('Current length:', ACCESS_TOKEN_SECRET.length);
  process.exit(1);
}

if (REFRESH_TOKEN_SECRET.length < 32) {
  logger.error('❌ FATAL: JWT_REFRESH_SECRET must be at least 32 characters (256-bit)');
  logger.error('Current length:', REFRESH_TOKEN_SECRET.length);
  process.exit(1);
}

// Warn if secrets are the same (should be different)
if (ACCESS_TOKEN_SECRET === REFRESH_TOKEN_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    logger.error('❌ FATAL: JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different in production!');
    process.exit(1);
  }
  logger.warn('⚠️  WARNING: JWT_ACCESS_SECRET and JWT_REFRESH_SECRET should be different!');
  logger.warn('Using the same secret for both tokens is not recommended.');
}

logger.info('✅ JWT secrets validated successfully');

const ACCESS_TOKEN_EXPIRY = "15m"; // 15 minutes
const REFRESH_TOKEN_EXPIRY_LONG = "7d"; // 7 days (remember me)
const REFRESH_TOKEN_EXPIRY_SHORT = "1d"; // 1 day (session)

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  organizationId: string;  // Added for multi-tenancy
}

export interface RefreshTokenPayload {
  userId: string;
  organizationId: string;  // Added for multi-tenancy
}

/**
 * Generate an access token (short-lived, 15 minutes)
 */
export function generateAccessToken(
  userId: string,
  email: string,
  role: string,
  organizationId: string
): string {
  const payload: TokenPayload = { userId, email, role, organizationId };

  return jwt.sign(payload, ACCESS_TOKEN_SECRET as string, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
    issuer: "realestate-pro-api",
    audience: "realestate-pro-client",
  });
}

/**
 * Generate a refresh token (long-lived, 7 days or 1 day based on rememberMe)
 */
export function generateRefreshToken(userId: string, organizationId: string, rememberMe: boolean = true): string {
  const payload: RefreshTokenPayload = { userId, organizationId };

  return jwt.sign(payload, REFRESH_TOKEN_SECRET as string, {
    expiresIn: rememberMe ? REFRESH_TOKEN_EXPIRY_LONG : REFRESH_TOKEN_EXPIRY_SHORT,
    issuer: "realestate-pro-api",
    audience: "realestate-pro-client",
  });
}

/** Get the expiry duration in milliseconds for a refresh token */
export function getRefreshTokenExpiryMs(rememberMe: boolean = true): number {
  return rememberMe ? 7 * 24 * 60 * 60 * 1000 : 1 * 24 * 60 * 60 * 1000;
}

/**
 * Verify an access token
 */
export function verifyAccessToken(token: string): TokenPayload {
  try {
    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET as string, {
      issuer: "realestate-pro-api",
      audience: "realestate-pro-client",
    }) as TokenPayload;

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError("Access token has expired");
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError("Invalid access token");
    }
    throw new UnauthorizedError("Token verification failed");
  }
}

/**
 * Verify a refresh token
 */
export function verifyRefreshToken(token: string): RefreshTokenPayload {
  try {
    const decoded = jwt.verify(token, REFRESH_TOKEN_SECRET as string, {
      issuer: "realestate-pro-api",
      audience: "realestate-pro-client",
    }) as RefreshTokenPayload;

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError("Refresh token has expired");
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError("Invalid refresh token");
    }
    throw new UnauthorizedError("Token verification failed");
  }
}

/**
 * Decode a token without verification (useful for debugging)
 */
export function decodeToken(token: string): jwt.JwtPayload | string | null {
  return jwt.decode(token);
}

// ===================================
// Access Token Denylist (Redis-backed)
// Prevents stolen access tokens from being used after logout.
// Falls back to in-memory Set when Redis is unavailable.
// ===================================

const DENYLIST_PREFIX = 'token:deny:';
const inMemoryDenylist = new Set<string>();

/** Access token TTL in seconds (must match ACCESS_TOKEN_EXPIRY) */
const ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // 15 minutes

/**
 * Add an access token to the denylist.
 * The entry auto-expires after the token's remaining TTL.
 */
export async function denyAccessToken(token: string): Promise<void> {
  try {
    // Decode without verify to get expiry (token is already verified at this point)
    const decoded = jwt.decode(token) as jwt.JwtPayload | null;
    const ttl = decoded?.exp
      ? Math.max(decoded.exp - Math.floor(Date.now() / 1000), 0)
      : ACCESS_TOKEN_TTL_SECONDS;

    if (ttl <= 0) return; // Already expired, no need to deny

    const redis = getRedisClient();
    if (redis) {
      await redis.set(`${DENYLIST_PREFIX}${token}`, '1', 'EX', ttl);
    } else {
      inMemoryDenylist.add(token);
      // Auto-cleanup after TTL
      setTimeout(() => inMemoryDenylist.delete(token), ttl * 1000);
    }
  } catch (err) {
    logger.warn('Failed to add token to denylist:', err);
    // Non-blocking — worst case the token remains valid for its remaining TTL
  }
}

/**
 * Check if an access token has been denied (logged out).
 * Fail-closed: if Redis is down, deny the token (security over availability).
 */
export async function isTokenDenied(token: string): Promise<boolean> {
  try {
    const redis = getRedisClient();
    if (redis) {
      const result = await redis.get(`${DENYLIST_PREFIX}${token}`);
      return result !== null;
    }
    return inMemoryDenylist.has(token);
  } catch (err) {
    logger.error('Token denylist check failed — rejecting token for safety:', err);
    return true; // Fail-closed: if Redis is down, deny the token
  }
}
