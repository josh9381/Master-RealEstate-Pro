import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { logger } from '../lib/logger';

// Augment Express Request with requestId for correlation (#108)
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

/**
 * #108: Correlation ID middleware — generates a UUID for every request.
 * The ID is:
 *  - stored on `req.requestId`
 *  - returned via `X-Request-ID` response header
 *  - included in every pino log line for this request
 */
export function correlationId(req: Request, res: Response, next: NextFunction): void {
  const id = (req.headers['x-request-id'] as string) || crypto.randomUUID();
  req.requestId = id;
  res.setHeader('X-Request-ID', id);
  next();
}

/**
 * #106/#107: Structured request logging with pino.
 * In development: pretty-printed with timing.
 * In production: JSON with full request context.
 * Always includes the correlation ID (#108).
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  const reqLog = logger.child({ requestId: req.requestId });

  // Log incoming request at debug level (won't appear in production default 'info' level)
  reqLog.debug({
    method: req.method,
    path: req.path,
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.get('user-agent'),
  }, 'Incoming request');

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logData = {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
      ip: req.ip || req.socket.remoteAddress,
    };

    if (res.statusCode >= 500) {
      reqLog.error(logData, 'Request completed with server error');
    } else if (res.statusCode >= 400) {
      reqLog.warn(logData, 'Request completed with client error');
    } else {
      reqLog.info(logData, 'Request completed');
    }
  });

  next();
}

/**
 * @deprecated Use `requestLogger` instead — pino handles dev/prod differences via transport config.
 * Kept for backward compatibility but now just delegates to requestLogger.
 */
export function productionLogger(req: Request, res: Response, next: NextFunction): void {
  return requestLogger(req, res, next);
}
