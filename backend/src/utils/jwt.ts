import jwt from "jsonwebtoken";
import { UnauthorizedError } from "../middleware/errorHandler";

// JWT configuration - Validate secrets at startup
const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET;

// Validate JWT secrets are configured
if (!ACCESS_TOKEN_SECRET || !REFRESH_TOKEN_SECRET) {
  console.error('❌ FATAL: JWT secrets are not configured!');
  console.error('Please set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET in your .env file');
  console.error('Generate strong secrets with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  process.exit(1);
}

// Validate secret strength (minimum 32 characters for 256-bit security)
if (ACCESS_TOKEN_SECRET.length < 32) {
  console.error('❌ FATAL: JWT_ACCESS_SECRET must be at least 32 characters (256-bit)');
  console.error('Current length:', ACCESS_TOKEN_SECRET.length);
  process.exit(1);
}

if (REFRESH_TOKEN_SECRET.length < 32) {
  console.error('❌ FATAL: JWT_REFRESH_SECRET must be at least 32 characters (256-bit)');
  console.error('Current length:', REFRESH_TOKEN_SECRET.length);
  process.exit(1);
}

// Warn if secrets are the same (should be different)
if (ACCESS_TOKEN_SECRET === REFRESH_TOKEN_SECRET) {
  console.warn('⚠️  WARNING: JWT_ACCESS_SECRET and JWT_REFRESH_SECRET should be different!');
  console.warn('Using the same secret for both tokens is not recommended.');
}

console.log('✅ JWT secrets validated successfully');

const ACCESS_TOKEN_EXPIRY = "15m"; // 15 minutes
const REFRESH_TOKEN_EXPIRY = "7d"; // 7 days

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
 * Generate a refresh token (long-lived, 7 days)
 */
export function generateRefreshToken(userId: string, organizationId: string): string {
  const payload: RefreshTokenPayload = { userId, organizationId };

  return jwt.sign(payload, REFRESH_TOKEN_SECRET as string, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
    issuer: "realestate-pro-api",
    audience: "realestate-pro-client",
  });
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
