import { Request, Response, NextFunction } from 'express'
import { validate, validateBody, validateParams, validateQuery } from '../../src/middleware/validate'
import { z } from 'zod'

jest.mock('../../src/lib/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}))

function mockReqResNext(body = {}, params = {}, query = {}) {
  const req = { body, params, query } as unknown as Request
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response
  const next = jest.fn() as NextFunction
  return { req, res, next }
}

describe('validate middleware', () => {
  const schema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
  })

  it('passes valid body and calls next()', async () => {
    const middleware = validate({ body: schema })
    const { req, res, next } = mockReqResNext({ name: 'John', email: 'john@test.com' })
    await middleware(req, res, next)
    expect(next).toHaveBeenCalledWith()
    expect(req.body).toEqual({ name: 'John', email: 'john@test.com' })
  })

  it('returns 400 on invalid body', async () => {
    const middleware = validate({ body: schema })
    const { req, res, next } = mockReqResNext({ name: '', email: 'not-an-email' })
    await middleware(req, res, next)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'Validation error',
        details: expect.arrayContaining([
          expect.objectContaining({ path: 'name' }),
          expect.objectContaining({ path: 'email' }),
        ]),
      })
    )
  })

  it('validates params', async () => {
    const paramSchema = z.object({ id: z.string().uuid() })
    const middleware = validate({ params: paramSchema })
    const { req, res, next } = mockReqResNext({}, { id: 'not-a-uuid' })
    await middleware(req, res, next)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('validates query and stores in validatedQuery', async () => {
    const querySchema = z.object({ page: z.coerce.number().min(1) })
    const middleware = validate({ query: querySchema })
    const { req, res, next } = mockReqResNext({}, {}, { page: '3' })
    await middleware(req, res, next)
    expect(next).toHaveBeenCalled()
    expect(req.validatedQuery).toEqual({ page: 3 })
  })

  it('passes non-Zod errors to next()', async () => {
    const badSchema = {
      parseAsync: () => { throw new Error('unexpected') },
    } as unknown as z.ZodSchema
    const middleware = validate({ body: badSchema })
    const { req, res, next } = mockReqResNext({ foo: 'bar' })
    await middleware(req, res, next)
    expect(next).toHaveBeenCalledWith(expect.any(Error))
  })
})

describe('validateBody', () => {
  it('validates body only', async () => {
    const schema = z.object({ title: z.string() })
    const middleware = validateBody(schema)
    const { req, res, next } = mockReqResNext({ title: 'Test' })
    await middleware(req, res, next)
    expect(next).toHaveBeenCalled()
  })
})

describe('validateParams', () => {
  it('validates params only', async () => {
    const schema = z.object({ id: z.string() })
    const middleware = validateParams(schema)
    const { req, res, next } = mockReqResNext({}, { id: '123' })
    await middleware(req, res, next)
    expect(next).toHaveBeenCalled()
  })
})

describe('validateQuery', () => {
  it('validates query only', async () => {
    const schema = z.object({ search: z.string() })
    const middleware = validateQuery(schema)
    const { req, res, next } = mockReqResNext({}, {}, { search: 'test' })
    await middleware(req, res, next)
    expect(next).toHaveBeenCalled()
  })
})
