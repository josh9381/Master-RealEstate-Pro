import { mockDeep, mockReset } from 'jest-mock-extended'
import type { PrismaClient } from '@prisma/client'
import { Request, Response } from 'express'

// Mock modules before imports
const mockPrisma = mockDeep<PrismaClient>()
jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: mockPrisma,
  prisma: mockPrisma,
}))

jest.mock('bcryptjs', () => ({
  __esModule: true,
  default: {
    hash: jest.fn().mockResolvedValue('hashed-password'),
    compare: jest.fn(),
  },
}))

jest.mock('../../src/utils/jwt', () => ({
  generateAccessToken: jest.fn(() => 'access-token-123'),
  generateRefreshToken: jest.fn(() => 'refresh-token-123'),
  verifyRefreshToken: jest.fn(),
  getRefreshTokenExpiryMs: jest.fn(() => 7 * 24 * 60 * 60 * 1000),
}))

jest.mock('../../src/utils/2fa', () => ({
  verify2FAToken: jest.fn(),
}))

jest.mock('../../src/services/email.service', () => ({
  sendEmail: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('../../src/utils/useragent', () => ({
  parseUserAgent: jest.fn(() => ({ deviceType: 'desktop', browser: 'Chrome', os: 'Linux' })),
}))

jest.mock('../../src/utils/geoip', () => ({
  lookupGeo: jest.fn(() => ({ country: 'US', city: 'NYC' })),
}))

jest.mock('../../src/services/audit.service', () => ({
  logAudit: jest.fn(),
  getRequestContext: jest.fn(() => ({ ip: '127.0.0.1', userAgent: 'test' })),
}))

jest.mock('../../src/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}))

jest.mock('../../src/config/socket', () => ({
  pushLeadUpdate: jest.fn(),
}))

import bcrypt from 'bcryptjs'
import { register, login, refresh, me, logout } from '../../src/controllers/auth.controller'
import { verifyRefreshToken } from '../../src/utils/jwt'
import { ConflictError, UnauthorizedError, NotFoundError } from '../../src/middleware/errorHandler'

function mockReqRes(body = {}, params = {}, user: any = undefined) {
  const req = {
    body,
    params,
    user,
    ip: '127.0.0.1',
    headers: { 'user-agent': 'jest-test' },
  } as unknown as Request
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response
  return { req, res }
}

describe('auth.controller', () => {
  beforeEach(() => {
    mockReset(mockPrisma)
    jest.clearAllMocks()
  })

  // ── register ────────────────────────────────────────────────────────────

  describe('register', () => {
    const validBody = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      password: 'StrongPass123!',
      companyName: 'Acme Inc',
      tosAccepted: true,
    }

    it('returns 400 when ToS is not accepted', async () => {
      const { req, res } = mockReqRes({ ...validBody, tosAccepted: false })
      await register(req, res)
      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: expect.stringContaining('Terms of Service') })
      )
    })

    it('throws ConflictError when email already exists', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'existing' } as any)
      const { req, res } = mockReqRes(validBody)
      await expect(register(req, res)).rejects.toThrow(/already exists/)
    })

    it('creates organization and user on success', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null)

      // Mock the transaction
      const mockUser = {
        id: 'user-1',
        organizationId: 'org-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        role: 'ADMIN',
        avatar: null,
        createdAt: new Date(),
      }
      const mockOrg = { id: 'org-1', name: 'Acme Inc', slug: 'acme-inc' }

      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          organization: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(mockOrg),
          },
          user: {
            create: jest.fn().mockResolvedValue(mockUser),
          },
        }
        return fn(tx)
      })

      // Mock subsequent user update for verification token
      mockPrisma.user.update.mockResolvedValue({} as any)
      mockPrisma.refreshToken.create.mockResolvedValue({} as any)

      const { req, res } = mockReqRes(validBody)
      await register(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            user: expect.objectContaining({ id: 'user-1' }),
            tokens: expect.objectContaining({
              accessToken: 'access-token-123',
              refreshToken: 'refresh-token-123',
            }),
          }),
        })
      )
    })
  })

  // ── login ───────────────────────────────────────────────────────────────

  describe('login', () => {
    const loginBody = { email: 'john@example.com', password: 'pass123' }

    const mockUser = {
      id: 'user-1',
      organizationId: 'org-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      role: 'ADMIN',
      password: 'hashed-password',
      avatar: null,
      twoFactorEnabled: false,
      twoFactorSecret: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
      organization: { id: 'org-1', name: 'Acme Inc', slug: 'acme-inc', isActive: true },
    }

    it('throws UnauthorizedError for non-existent user', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null)
      const { req, res } = mockReqRes(loginBody)
      await expect(login(req, res)).rejects.toThrow(/Invalid credentials/)
    })

    it('throws UnauthorizedError for inactive organization', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        ...mockUser,
        organization: { ...mockUser.organization, isActive: false },
      } as any)
      const { req, res } = mockReqRes(loginBody)
      await expect(login(req, res)).rejects.toThrow(/inactive/i)
    })

    it('throws UnauthorizedError when account is locked', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        ...mockUser,
        lockedUntil: new Date(Date.now() + 60 * 60 * 1000), // locked for 1 hour
      } as any)
      const { req, res } = mockReqRes(loginBody)
      await expect(login(req, res)).rejects.toThrow(/locked/i)
    })

    it('throws UnauthorizedError on wrong password', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser as any)
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(false)
      mockPrisma.user.update.mockResolvedValue({} as any)

      const { req, res } = mockReqRes(loginBody)
      await expect(login(req, res)).rejects.toThrow(/Invalid credentials/)
    })

    it('increments failedLoginAttempts on wrong password', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser as any)
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(false)
      mockPrisma.user.update.mockResolvedValue({} as any)

      const { req, res } = mockReqRes(loginBody)
      try { await login(req, res) } catch {}
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ failedLoginAttempts: 1 }),
        })
      )
    })

    it('locks account after 5 failed attempts', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        ...mockUser,
        failedLoginAttempts: 4, // this will be the 5th
      } as any)
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(false)
      mockPrisma.user.update.mockResolvedValue({} as any)

      const { req, res } = mockReqRes(loginBody)
      await expect(login(req, res)).rejects.toThrow(/locked/)
    })

    it('completes login on valid credentials', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser as any)
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)
      mockPrisma.user.update.mockResolvedValue({} as any)
      mockPrisma.refreshToken.create.mockResolvedValue({} as any)
      mockPrisma.loginHistory.create.mockResolvedValue({} as any)

      const { req, res } = mockReqRes(loginBody)
      await login(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            tokens: expect.objectContaining({
              accessToken: 'access-token-123',
              refreshToken: 'refresh-token-123',
            }),
          }),
        })
      )
    })

    it('resets failedLoginAttempts on successful login', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        ...mockUser,
        failedLoginAttempts: 3,
      } as any)
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)
      mockPrisma.user.update.mockResolvedValue({} as any)
      mockPrisma.refreshToken.create.mockResolvedValue({} as any)
      mockPrisma.loginHistory.create.mockResolvedValue({} as any)

      const { req, res } = mockReqRes(loginBody)
      await login(req, res)

      // First call resets attempts, second updates lastLoginAt
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ failedLoginAttempts: 0, lockedUntil: null }),
        })
      )
    })

    it('returns 2FA challenge when 2FA is enabled and no code provided', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        ...mockUser,
        twoFactorEnabled: true,
        twoFactorSecret: 'secret123',
      } as any)
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)
      mockPrisma.refreshToken.create.mockResolvedValue({} as any)

      const { req, res } = mockReqRes(loginBody)
      await login(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            requires2FA: true,
            pendingToken: expect.any(String),
          }),
        })
      )
    })
  })

  // ── refresh ─────────────────────────────────────────────────────────────

  describe('refresh', () => {
    it('throws UnauthorizedError when token is not in DB', async () => {
      ;(verifyRefreshToken as jest.Mock).mockReturnValue({ userId: 'u1', organizationId: 'org-1' })
      mockPrisma.refreshToken.findUnique.mockResolvedValue(null)

      const { req, res } = mockReqRes({ refreshToken: 'some-token' })
      await expect(refresh(req, res)).rejects.toThrow(/Invalid refresh token/)
    })

    it('revokes all tokens on token reuse (theft detection)', async () => {
      ;(verifyRefreshToken as jest.Mock).mockReturnValue({ userId: 'u1', organizationId: 'org-1' })
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        token: 'some-token',
        userId: 'u1',
        revokedAt: new Date(), // Already revoked = reuse attack
        expiresAt: new Date(Date.now() + 100000),
      } as any)
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 3 } as any)

      const { req, res } = mockReqRes({ refreshToken: 'some-token' })
      await expect(refresh(req, res)).rejects.toThrow(/reuse detected/)
      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalled()
    })

    it('throws UnauthorizedError when token is expired', async () => {
      ;(verifyRefreshToken as jest.Mock).mockReturnValue({ userId: 'u1', organizationId: 'org-1' })
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        token: 'some-token',
        userId: 'u1',
        revokedAt: null,
        expiresAt: new Date(Date.now() - 100000), // Expired
      } as any)

      const { req, res } = mockReqRes({ refreshToken: 'some-token' })
      await expect(refresh(req, res)).rejects.toThrow(/expired/i)
    })

    it('throws UnauthorizedError when user not found', async () => {
      ;(verifyRefreshToken as jest.Mock).mockReturnValue({ userId: 'u1', organizationId: 'org-1' })
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        token: 'some-token',
        userId: 'u1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 100000),
      } as any)
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const { req, res } = mockReqRes({ refreshToken: 'some-token' })
      await expect(refresh(req, res)).rejects.toThrow(/not found/i)
    })

    it('issues new tokens and revokes old one (rotation)', async () => {
      ;(verifyRefreshToken as jest.Mock).mockReturnValue({ userId: 'u1', organizationId: 'org-1' })
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        token: 'old-token',
        userId: 'u1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 100000),
      } as any)
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        organizationId: 'org-1',
        email: 'test@example.com',
        role: 'ADMIN',
      } as any)
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 1 } as any)
      mockPrisma.refreshToken.create.mockResolvedValue({} as any)
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({} as any)

      const { req, res } = mockReqRes({ refreshToken: 'old-token' })
      await refresh(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            accessToken: expect.any(String),
            refreshToken: expect.any(String),
          }),
        })
      )
    })
  })

  // ── me ──────────────────────────────────────────────────────────────────

  describe('me', () => {
    it('throws UnauthorizedError when not authenticated', async () => {
      const { req, res } = mockReqRes()
      await expect(me(req, res)).rejects.toThrow(/Authentication required/)
    })

    it('throws NotFoundError when user not in DB', async () => {
      const { req, res } = mockReqRes({}, {}, { userId: 'u1', organizationId: 'org-1' })
      mockPrisma.user.findUnique.mockResolvedValue(null)
      await expect(me(req, res)).rejects.toThrow(/not found/i)
    })

    it('returns user with calculated permissions', async () => {
      const mockUser = {
        id: 'u1',
        organizationId: 'org-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        role: 'ADMIN',
        avatar: null,
        subscriptionTier: null,
        subscriptionId: null,
        timezone: 'UTC',
        language: 'en',
        createdAt: new Date(),
        lastLoginAt: new Date(),
        organization: {
          id: 'org-1',
          name: 'Acme',
          slug: 'acme',
          logo: null,
          subscriptionTier: 'STARTER',
          trialEndsAt: null,
          domain: null,
        },
      }
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)

      const { req, res } = mockReqRes({}, {}, { userId: 'u1', organizationId: 'org-1' })
      await me(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            user: expect.objectContaining({
              id: 'u1',
              permissions: expect.objectContaining({
                canManageUsers: true,
                canManageOrg: true,
              }),
            }),
          }),
        })
      )
    })
  })
})
