import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

// Extend Express Request to include validated data
declare global {
  namespace Express {
    interface Request {
      validatedQuery?: unknown;
    }
  }
}

/**
 * Validation middleware factory
 * Validates request body, params, or query against a Zod schema
 */
export function validate(schema: {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate body
      if (schema.body) {
        req.body = await schema.body.parseAsync(req.body);
      }

      // Validate params
      if (schema.params) {
        req.params = await schema.params.parseAsync(req.params) as typeof req.params;
      }

      // Validate query - store in validatedQuery since req.query is readonly
      if (schema.query) {
        req.validatedQuery = await schema.query.parseAsync(req.query);
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.issues.map(issue => ({
            path: issue.path.join('.'),
            message: issue.message,
            code: issue.code
          }))
        });
        return;
      }
      next(error);
    }
  };
}

/**
 * Quick validation for body only
 */
export function validateBody(schema: ZodSchema) {
  return validate({ body: schema });
}

/**
 * Quick validation for params only
 */
export function validateParams(schema: ZodSchema) {
  return validate({ params: schema });
}

/**
 * Quick validation for query only
 */
export function validateQuery(schema: ZodSchema) {
  return validate({ query: schema });
}
