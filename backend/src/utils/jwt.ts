import jwt from "jsonwebtoken";
import { UnauthorizedError } from "../middleware/errorHandler";

// JWT configuration
const ACCESS_TOKEN_SECRET =
  process.env.JWT_ACCESS_SECRET ||
  "your-access-token-secret-change-in-production";
const REFRESH_TOKEN_SECRET =
  process.env.JWT_REFRESH_SECRET ||
  "your-refresh-token-secret-change-in-production";
const ACCESS_TOKEN_EXPIRY = "15m"; // 15 minutes
const REFRESH_TOKEN_EXPIRY = "7d"; // 7 days

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export interface RefreshTokenPayload {
  userId: string;
}

/**
 * Generate an access token (short-lived, 15 minutes)
 */
export function generateAccessToken(
  userId: string,
  email: string,
  role: string
): string {
  const payload: TokenPayload = { userId, email, role };

  return jwt.sign(payload, ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
    issuer: "realestate-pro-api",
    audience: "realestate-pro-client",
  });
}

/**
 * Generate a refresh token (long-lived, 7 days)
 */
export function generateRefreshToken(userId: string): string {
  const payload: RefreshTokenPayload = { userId };

  return jwt.sign(payload, REFRESH_TOKEN_SECRET, {
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
    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET, {
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
    const decoded = jwt.verify(token, REFRESH_TOKEN_SECRET, {
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
