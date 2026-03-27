import { Request, Response, NextFunction } from 'express'
import { requireAdmin, requireAdminOrManager } from '../../src/middleware/admin'

function mockReqResNext(user?: Record<string, unknown>) {
  const req = { user } as unknown as Request
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response
  const next = jest.fn() as NextFunction
  return { req, res, next }
}

describe('requireAdmin middleware', () => {
  it('returns 401 when no user on request', () => {
    const { req, res, next } = mockReqResNext(undefined)
    requireAdmin(req, res, next)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 403 when user is not ADMIN', () => {
    const { req, res, next } = mockReqResNext({ role: 'USER', userId: 'u1', email: 'u@x.com', organizationId: 'org-1' })
    requireAdmin(req, res, next)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 403 for MANAGER role', () => {
    const { req, res, next } = mockReqResNext({ role: 'MANAGER', userId: 'u1', email: 'u@x.com', organizationId: 'org-1' })
    requireAdmin(req, res, next)
    expect(res.status).toHaveBeenCalledWith(403)
  })

  it('calls next() for ADMIN role', () => {
    const { req, res, next } = mockReqResNext({ role: 'ADMIN', userId: 'u1', email: 'u@x.com', organizationId: 'org-1' })
    requireAdmin(req, res, next)
    expect(next).toHaveBeenCalled()
  })
})

describe('requireAdminOrManager middleware', () => {
  it('returns 401 when no user on request', () => {
    const { req, res, next } = mockReqResNext(undefined)
    requireAdminOrManager(req, res, next)
    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('returns 403 for USER role', () => {
    const { req, res, next } = mockReqResNext({ role: 'USER', userId: 'u1', email: 'u@x.com', organizationId: 'org-1' })
    requireAdminOrManager(req, res, next)
    expect(res.status).toHaveBeenCalledWith(403)
  })

  it('calls next() for ADMIN role', () => {
    const { req, res, next } = mockReqResNext({ role: 'ADMIN', userId: 'u1', email: 'u@x.com', organizationId: 'org-1' })
    requireAdminOrManager(req, res, next)
    expect(next).toHaveBeenCalled()
  })

  it('calls next() for MANAGER role', () => {
    const { req, res, next } = mockReqResNext({ role: 'MANAGER', userId: 'u1', email: 'u@x.com', organizationId: 'org-1' })
    requireAdminOrManager(req, res, next)
    expect(next).toHaveBeenCalled()
  })
})
