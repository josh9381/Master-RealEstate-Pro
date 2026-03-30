import { Request, Response, NextFunction } from 'express'
import { authenticate } from '../../src/middleware/auth'
import { verifyAccessToken, isTokenDenied } from '../../src/utils/jwt'

jest.mock('../../src/utils/jwt')

const mockVerify = verifyAccessToken as jest.MockedFunction<typeof verifyAccessToken>
const mockIsTokenDenied = isTokenDenied as jest.MockedFunction<typeof isTokenDenied>

function mockReqResNext() {
  const req = { headers: {} } as unknown as Request
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response
  const next = jest.fn() as NextFunction
  return { req, res, next }
}

describe('authenticate middleware', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when no authorization header', () => {
    const { req, res, next } = mockReqResNext()
    authenticate(req, res, next)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'No authorization header provided' })
    )
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 401 when authorization header lacks Bearer prefix', () => {
    const { req, res, next } = mockReqResNext()
    req.headers.authorization = 'Token abc123'
    authenticate(req, res, next)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('Invalid authorization header') })
    )
  })

  it('returns 401 when token is invalid', () => {
    const { req, res, next } = mockReqResNext()
    req.headers.authorization = 'Bearer bad-token'
    mockVerify.mockImplementation(() => { throw new Error('Invalid token') })
    authenticate(req, res, next)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('attaches user and calls next() on valid token', async () => {
    const { req, res, next } = mockReqResNext()
    req.headers.authorization = 'Bearer valid-token'
    const payload = { userId: 'u1', email: 'a@b.com', role: 'ADMIN', organizationId: 'org-1' }
    mockVerify.mockReturnValue(payload)
    mockIsTokenDenied.mockResolvedValue(false)
    authenticate(req, res, next)
    // Wait for async denylist check to resolve
    await new Promise(process.nextTick)
    expect(req.user).toEqual(payload)
    expect(next).toHaveBeenCalled()
  })

  it('correctly parses Bearer token from header', () => {
    const { req, res, next } = mockReqResNext()
    req.headers.authorization = 'Bearer my-jwt-token'
    const payload = { userId: 'u1', email: 'a@b.com', role: 'USER', organizationId: 'org-1' }
    mockVerify.mockReturnValue(payload)
    mockIsTokenDenied.mockResolvedValue(false)
    authenticate(req, res, next)
    expect(mockVerify).toHaveBeenCalledWith('my-jwt-token')
  })
})
