import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to require ADMIN role
 * Returns 403 if user is not an admin
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ 
      error: 'Access denied. Admin privileges required.',
      requiredRole: 'ADMIN',
      userRole: req.user.role,
    });
  }

  next();
};

/**
 * Middleware to require ADMIN or MANAGER role
 * Returns 403 if user is neither admin nor manager
 */
export const requireAdminOrManager = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role !== 'ADMIN' && req.user.role !== 'MANAGER') {
    return res.status(403).json({ 
      error: 'Access denied. Admin or Manager privileges required.',
      requiredRoles: ['ADMIN', 'MANAGER'],
      userRole: req.user.role,
    });
  }

  next();
};
