import { Request, Response, NextFunction } from 'express';

/**
 * Request logging middleware
 * Logs incoming requests with method, path, IP, and response time
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  
  // Log request
  const requestLog = {
    method: req.method,
    path: req.path,
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.get('user-agent'),
    timestamp: new Date().toISOString()
  };

  console.log(`📨 ${requestLog.method} ${requestLog.path} - ${requestLog.ip}`);

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const statusColor = res.statusCode >= 500 ? '🔴' 
                      : res.statusCode >= 400 ? '🟡'
                      : res.statusCode >= 300 ? '🔵'
                      : '🟢';
    
    console.log(
      `${statusColor} ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`
    );
  });

  next();
}

/**
 * Minimal logger for production (logs only errors and important events)
 */
export function productionLogger(req: Request, res: Response, next: NextFunction): void {
  // Only log in production mode
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }

  res.on('finish', () => {
    // Only log errors (4xx and 5xx)
    if (res.statusCode >= 400) {
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.path,
        status: res.statusCode,
        ip: req.ip,
        userAgent: req.get('user-agent')
      }));
    }
  });

  next();
}
