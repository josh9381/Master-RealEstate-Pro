import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';

// Extend Express Request type to include user with organizationId
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        role: string;
        organizationId: string;  // Added for multi-tenancy
      };
    }
  }
}

/**
 * Middleware to authenticate requests using JWT tokens
 * Expects: Authorization: Bearer <token>
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      res.status(401).json({
        success: false,
        error: 'No authorization header provided'
      });
      return;
    }

    // Check for Bearer token format
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      res.status(401).json({
        success: false,
        error: 'Invalid authorization header format. Expected: Bearer <token>'
      });
      return;
    }

    const token = parts[1];

    // Verify the token
    const payload = verifyAccessToken(token);

    // Attach user info to request object (including organizationId for multi-tenancy)
    req.user = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      organizationId: payload.organizationId
    };

    // Continue to next middleware/handler
    next();
  } catch (error) {
    if (error instanceof Error) {
      res.status(401).json({
        success: false,
        error: error.message
      });
    } else {
      res.status(401).json({
        success: false,
        error: 'Authentication failed'
      });
    }
  }
}

/**
 * Middleware to check if user has admin role
 * Must be used after authenticate middleware
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
    return;
  }

  if (req.user.role !== 'ADMIN') {
    res.status(403).json({
      success: false,
      error: 'Admin access required'
    });
    return;
  }

  next();
}
