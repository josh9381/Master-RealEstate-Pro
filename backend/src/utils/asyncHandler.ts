import { Request, Response, NextFunction } from 'express';

type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void | Response>;

/**
 * Async handler wrapper
 * Wraps async route handlers and automatically catches errors
 * This eliminates the need for try-catch blocks in every route handler
 * 
 * Usage:
 * router.get('/example', asyncHandler(async (req, res) => {
 *   const data = await someAsyncOperation();
 *   res.json({ data });
 * }));
 */
export function asyncHandler(fn: AsyncRequestHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
