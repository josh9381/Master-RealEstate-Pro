import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import {
  errorHandler,
  notFoundHandler,
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  TooManyRequestsError,
  InternalServerError,
} from '../../src/middleware/errorHandler'

jest.mock('../../src/lib/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}))
jest.mock('@sentry/node', () => ({
  captureException: jest.fn(),
}))

function mockReqRes() {
  const req = { path: '/test', method: 'GET', requestId: 'req-1' } as unknown as Request
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response
  const next = jest.fn() as NextFunction
  return { req, res, next }
}

describe('Custom Error Classes', () => {
  it('AppError has correct statusCode and message', () => {
    const err = new AppError(418, "I'm a teapot")
    expect(err.statusCode).toBe(418)
    expect(err.message).toBe("I'm a teapot")
    expect(err.isOperational).toBe(true)
  })

  it('ValidationError is 400', () => {
    const err = new ValidationError('Bad input', { field: 'name' })
    expect(err.statusCode).toBe(400)
    expect(err.details).toEqual({ field: 'name' })
  })

  it('UnauthorizedError is 401', () => {
    expect(new UnauthorizedError().statusCode).toBe(401)
    expect(new UnauthorizedError('Custom msg').message).toBe('Custom msg')
  })

  it('ForbiddenError is 403', () => {
    expect(new ForbiddenError().statusCode).toBe(403)
  })

  it('NotFoundError is 404', () => {
    expect(new NotFoundError().statusCode).toBe(404)
  })

  it('ConflictError is 409', () => {
    expect(new ConflictError('Duplicate').statusCode).toBe(409)
  })

  it('TooManyRequestsError is 429', () => {
    expect(new TooManyRequestsError().statusCode).toBe(429)
  })

  it('InternalServerError is 500', () => {
    expect(new InternalServerError().statusCode).toBe(500)
  })
})

describe('errorHandler middleware', () => {
  it('handles ZodError with 400', () => {
    // Create a real ZodError by using zod schema validation
    const { z } = require('zod')
    let zodErr: any
    try {
      z.object({ email: z.string().email() }).parse({ email: 123 })
    } catch (e) {
      zodErr = e
    }
    const { req, res, next } = mockReqRes()
    errorHandler(zodErr!, req, res, next)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: 'Validation error' })
    )
  })

  it('handles AppError with correct status code', () => {
    const err = new NotFoundError('Lead not found')
    const { req, res, next } = mockReqRes()
    errorHandler(err, req, res, next)
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Lead not found' })
    )
  })

  it('handles Prisma P2002 unique constraint as 409', () => {
    const err = new Error('Unique constraint') as any
    err.name = 'PrismaClientKnownRequestError'
    err.code = 'P2002'
    err.meta = { target: ['email'] }
    const { req, res, next } = mockReqRes()
    errorHandler(err, req, res, next)
    expect(res.status).toHaveBeenCalledWith(409)
  })

  it('handles Prisma P2025 not found as 404', () => {
    const err = new Error('Not found') as any
    err.name = 'PrismaClientKnownRequestError'
    err.code = 'P2025'
    const { req, res, next } = mockReqRes()
    errorHandler(err, req, res, next)
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('handles Prisma P2003 foreign key as 400', () => {
    const err = new Error('FK violation') as any
    err.name = 'PrismaClientKnownRequestError'
    err.code = 'P2003'
    const { req, res, next } = mockReqRes()
    errorHandler(err, req, res, next)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('handles JWT errors as 401', () => {
    const err = new Error('jwt malformed')
    err.name = 'JsonWebTokenError'
    const { req, res, next } = mockReqRes()
    errorHandler(err, req, res, next)
    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('handles TokenExpiredError as 401', () => {
    const err = new Error('jwt expired')
    err.name = 'TokenExpiredError'
    const { req, res, next } = mockReqRes()
    errorHandler(err, req, res, next)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Token has expired' })
    )
  })

  it('handles payload too large as 413', () => {
    const err = new Error('request entity too large') as any
    err.type = 'entity.too.large'
    const { req, res, next } = mockReqRes()
    errorHandler(err, req, res, next)
    expect(res.status).toHaveBeenCalledWith(413)
  })

  it('returns generic message in production for unknown errors', () => {
    const prev = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    const err = new Error('DB connection string leaked')
    const { req, res, next } = mockReqRes()
    errorHandler(err, req, res, next)
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Internal server error' })
    )
    process.env.NODE_ENV = prev
  })

  it('sanitizes API keys in error messages in development', () => {
    const prev = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'
    const err = new Error('Failed with key sk-1234567890abcdef1234567890abcdef')
    const { req, res, next } = mockReqRes()
    errorHandler(err, req, res, next)
    const response = (res.json as jest.Mock).mock.calls[0][0]
    expect(response.error).not.toContain('sk-1234567890abcdef')
    expect(response.error).toContain('sk-***REDACTED***')
    process.env.NODE_ENV = prev
  })
})

describe('notFoundHandler', () => {
  it('returns 404 with route info', () => {
    const { req, res } = mockReqRes()
    notFoundHandler(req, res)
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'Route not found',
        message: 'Cannot GET /test',
      })
    )
  })
})
