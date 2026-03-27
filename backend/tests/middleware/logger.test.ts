import crypto from 'crypto'

jest.mock('../../src/lib/logger', () => ({
  logger: {
    pino: {
      child: jest.fn().mockReturnValue({
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      }),
    },
  },
}))

import { correlationId, requestLogger } from '../../src/middleware/logger'

function makeMocks() {
  const req: any = {
    headers: {},
    method: 'GET',
    path: '/api/test',
    ip: '127.0.0.1',
    get: jest.fn().mockReturnValue('TestAgent/1.0'),
    socket: { remoteAddress: '127.0.0.1' },
  }
  const res: any = {
    setHeader: jest.fn(),
    statusCode: 200,
    on: jest.fn(),
  }
  const next = jest.fn()
  return { req, res, next }
}

describe('correlationId middleware', () => {
  it('generates a UUID when no X-Request-ID header present', () => {
    const { req, res, next } = makeMocks()
    correlationId(req, res, next)

    expect(req.requestId).toBeDefined()
    // UUID v4 format
    expect(req.requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    )
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-ID', req.requestId)
    expect(next).toHaveBeenCalled()
  })

  it('uses existing X-Request-ID header if provided', () => {
    const { req, res, next } = makeMocks()
    req.headers['x-request-id'] = 'existing-id-123'
    correlationId(req, res, next)

    expect(req.requestId).toBe('existing-id-123')
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-ID', 'existing-id-123')
  })
})

describe('requestLogger middleware', () => {
  it('calls next()', () => {
    const { req, res, next } = makeMocks()
    requestLogger(req, res, next)
    expect(next).toHaveBeenCalled()
  })

  it('registers a finish listener on response', () => {
    const { req, res, next } = makeMocks()
    requestLogger(req, res, next)
    expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function))
  })
})
