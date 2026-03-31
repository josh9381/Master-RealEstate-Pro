import { logger } from '../lib/logger'
import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

// Fields whose values must never appear in logs
const SENSITIVE_FIELDS = new Set([
  'password', 'newpassword', 'currentpassword', 'confirmpassword',
  'token', 'refreshtoken', 'accesstoken', 'apikey', 'secret',
  'openaiApiKey', 'encryptionkey', 'creditcard', 'ssn',
  'twilio_auth_token', 'sendgrid_api_key', 'stripe_secret_key',
]);

/**
 * Redact sensitive field values from an object before logging.
 */
function redactSensitiveFields(data: unknown): unknown {
  if (typeof data !== 'object' || data === null) return data;
  if (Array.isArray(data)) return data.map(redactSensitiveFields);
  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (SENSITIVE_FIELDS.has(key.toLowerCase().replace(/[_-]/g, ''))) {
      redacted[key] = '***REDACTED***';
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactSensitiveFields(value);
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

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
        logger.error('❌ Validation error:', error.issues)
        logger.error('📥 Request body that failed validation:', JSON.stringify(redactSensitiveFields(req.body)))
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
