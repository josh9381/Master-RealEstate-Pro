import { Request, Response, NextFunction } from 'express'
import { csrfProtection } from '../../src/middleware/csrf'

jest.mock('../../src/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}))

function mockReqResNext(overrides: Partial<Request> = {}) {
  const req = {
    method: 'POST',
    path: '/api/leads',
    headers: {},
    ip: '127.0.0.1',
    ...overrides,
  } as unknown as Request
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response
  const next = jest.fn() as NextFunction
  return { req, res, next }
}

describe('csrfProtection middleware', () => {
  const origEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...origEnv }
  })

  // ── Safe methods pass through ─────────────────────────────────
  it('allows GET requests without checks', () => {
    const { req, res, next } = mockReqResNext({ method: 'GET' })
    csrfProtection(req, res, next)
    expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
  })

  it('allows HEAD requests without checks', () => {
    const { req, res, next } = mockReqResNext({ method: 'HEAD' })
    csrfProtection(req, res, next)
    expect(next).toHaveBeenCalled()
  })

  it('allows OPTIONS requests without checks', () => {
    const { req, res, next } = mockReqResNext({ method: 'OPTIONS' })
    csrfProtection(req, res, next)
    expect(next).toHaveBeenCalled()
  })

  // ── Exempt routes ─────────────────────────────────────────────
  it('allows webhook routes', () => {
    process.env.NODE_ENV = 'production'
    process.env.FRONTEND_URL = 'https://app.example.com'
    const { req, res, next } = mockReqResNext({ path: '/api/webhooks/stripe' })
    csrfProtection(req, res, next)
    expect(next).toHaveBeenCalled()
  })

  it('allows health check routes', () => {
    process.env.NODE_ENV = 'production'
    process.env.FRONTEND_URL = 'https://app.example.com'
    const { req, res, next } = mockReqResNext({ path: '/health' })
    csrfProtection(req, res, next)
    expect(next).toHaveBeenCalled()
  })

  it('allows unsubscribe routes', () => {
    process.env.NODE_ENV = 'production'
    process.env.FRONTEND_URL = 'https://app.example.com'
    const { req, res, next } = mockReqResNext({ path: '/api/unsubscribe/some-token' })
    csrfProtection(req, res, next)
    expect(next).toHaveBeenCalled()
  })

  // ── Development mode bypass ───────────────────────────────────
  it('allows all requests in dev mode without FRONTEND_URL set', () => {
    process.env.NODE_ENV = 'development'
    delete process.env.FRONTEND_URL
    const { req, res, next } = mockReqResNext({
      headers: { 'content-type': 'application/x-www-form-urlencoded', origin: 'http://evil.com' } as any,
    })
    csrfProtection(req, res, next)
    expect(next).toHaveBeenCalled()
  })

  // ── Content-Type enforcement ──────────────────────────────────
  it('rejects form-encoded content type on JSON endpoints in production', () => {
    process.env.NODE_ENV = 'production'
    process.env.FRONTEND_URL = 'https://app.example.com'
    const { req, res, next } = mockReqResNext({
      headers: { 'content-type': 'application/x-www-form-urlencoded' } as any,
      path: '/api/leads',
    })
    csrfProtection(req, res, next)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('content type') }))
    expect(next).not.toHaveBeenCalled()
  })

  it('allows multipart/form-data on upload routes', () => {
    process.env.NODE_ENV = 'production'
    process.env.FRONTEND_URL = 'https://app.example.com'
    const { req, res, next } = mockReqResNext({
      headers: { 'content-type': 'multipart/form-data; boundary=----WebKit', origin: 'https://app.example.com' } as any,
      path: '/api/settings/avatar',
    })
    csrfProtection(req, res, next)
    expect(next).toHaveBeenCalled()
  })

  // ── Origin / Referer validation ───────────────────────────────
  it('allows requests from known FRONTEND_URL origin', () => {
    process.env.NODE_ENV = 'production'
    process.env.FRONTEND_URL = 'https://app.example.com'
    const { req, res, next } = mockReqResNext({
      headers: { 'content-type': 'application/json', origin: 'https://app.example.com' } as any,
    })
    csrfProtection(req, res, next)
    expect(next).toHaveBeenCalled()
  })

  it('rejects requests from unknown origin in production', () => {
    process.env.NODE_ENV = 'production'
    process.env.FRONTEND_URL = 'https://app.example.com'
    const { req, res, next } = mockReqResNext({
      headers: { 'content-type': 'application/json', origin: 'https://evil.com' } as any,
    })
    csrfProtection(req, res, next)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('origin') }))
    expect(next).not.toHaveBeenCalled()
  })

  it('falls back to referer header when no origin', () => {
    process.env.NODE_ENV = 'production'
    process.env.FRONTEND_URL = 'https://app.example.com'
    const { req, res, next } = mockReqResNext({
      headers: { 'content-type': 'application/json', referer: 'https://app.example.com/settings' } as any,
    })
    csrfProtection(req, res, next)
    expect(next).toHaveBeenCalled()
  })

  it('allows requests with no origin or referer (mobile apps, curl)', () => {
    process.env.NODE_ENV = 'production'
    process.env.FRONTEND_URL = 'https://app.example.com'
    const { req, res, next } = mockReqResNext({
      headers: { 'content-type': 'application/json' } as any,
    })
    csrfProtection(req, res, next)
    expect(next).toHaveBeenCalled()
  })
})
