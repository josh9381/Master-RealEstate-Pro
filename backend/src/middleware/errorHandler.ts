import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

/**
 * Custom Error Classes
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public details?: unknown) {
    super(400, message);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(401, message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Access forbidden') {
    super(403, message);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(404, message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message);
    this.name = 'ConflictError';
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(429, message);
    this.name = 'TooManyRequestsError';
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = 'Internal server error') {
    super(500, message);
    this.name = 'InternalServerError';
  }
}

/**
 * Global Error Handler Middleware
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Default error
  let statusCode = 500;
  let message = 'Internal server error';
  let details: unknown = undefined;

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Validation error';
    details = err.issues.map(issue => ({
      path: issue.path.join('.'),
      message: issue.message,
      code: issue.code
    }));
  }
  // Handle our custom AppError
  else if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    
    if (err instanceof ValidationError) {
      details = err.details;
    }
  }
  // Handle Prisma errors
  else if (err.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as unknown as { code: string; meta?: { target?: string[] } };
    
    if (prismaError.code === 'P2002') {
      statusCode = 409;
      message = 'A record with this value already exists';
      details = { field: prismaError.meta?.target };
    } else if (prismaError.code === 'P2025') {
      statusCode = 404;
      message = 'Record not found';
    } else if (prismaError.code === 'P2003') {
      statusCode = 400;
      message = 'Invalid reference to related record';
    }
  }
  // Handle JWT errors
  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }
  else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token has expired';
  }
  // Unknown errors
  else {
    message = process.env.NODE_ENV === 'development' 
      ? err.message 
      : 'Internal server error';
  }

  // Log error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('❌ Error:', {
      name: err.name,
      message: err.message,
      stack: err.stack,
      statusCode
    });
  } else {
    // In production, log minimal info
    console.error('❌ Error:', {
      statusCode,
      message,
      path: req.path,
      method: req.method
    });
  }

  // Send error response
  const response: {
    success: false;
    error: string;
    details?: unknown;
    stack?: string;
  } = {
    success: false,
    error: message
  };

  if (details) {
    response.details = details;
  }

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development' && !(err instanceof AppError)) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

/**
 * 404 Not Found Handler
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.path}`,
    availableRoutes: [
      'GET /health',
      'GET /api',
      'POST /api/auth/register',
      'POST /api/auth/login',
      'POST /api/auth/refresh',
      'GET /api/auth/me'
    ]
  });
}
