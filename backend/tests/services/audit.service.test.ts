import { mockDeep, mockReset } from 'jest-mock-extended'
import type { PrismaClient } from '@prisma/client'

const mockPrisma = mockDeep<PrismaClient>()
jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: mockPrisma,
  prisma: mockPrisma,
}))

jest.mock('../../src/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}))

import { logAudit, getRequestContext } from '../../src/services/audit.service'

describe('logAudit', () => {
  beforeEach(() => {
    mockReset(mockPrisma)
    mockPrisma.auditLog.create.mockResolvedValue({} as never)
  })

  const baseEntry = {
    organizationId: 'org-1',
    action: 'CREATED' as const,
    entityType: 'Lead',
    description: 'Created a lead',
  }

  it('creates an audit log entry', async () => {
    await logAudit(baseEntry)
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: 'org-1',
          entityType: 'Lead',
          description: 'Created a lead',
        }),
      })
    )
  })

  it('includes userId when provided', async () => {
    await logAudit({ ...baseEntry, userId: 'user-1' })
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 'user-1' }),
      })
    )
  })

  it('redacts sensitive fields from beforeData', async () => {
    await logAudit({
      ...baseEntry,
      beforeData: { name: 'John', password: 'secret123', email: 'j@example.com' },
    })
    const call = mockPrisma.auditLog.create.mock.calls[0][0]
    const beforeData = call.data.beforeData as Record<string, unknown>
    expect(beforeData.password).toBe('[REDACTED]')
    expect(beforeData.name).toBe('John')
    expect(beforeData.email).toBe('j@example.com')
  })

  it('redacts sensitive fields from afterData', async () => {
    await logAudit({
      ...baseEntry,
        afterData: { secret: 'my-secret-value', value: 100 },
    })
    const call = mockPrisma.auditLog.create.mock.calls[0][0]
    const afterData = call.data.afterData as Record<string, unknown>
      expect(afterData.secret).toBe('[REDACTED]')
    expect(afterData.value).toBe(100)
  })

  it('does not throw when prisma.create fails (audit must never break requests)', async () => {
    mockPrisma.auditLog.create.mockRejectedValue(new Error('DB error'))
    await expect(logAudit(baseEntry)).resolves.toBeUndefined()
  })
})

describe('getRequestContext', () => {
  it('extracts ip and user-agent from request', () => {
    const req = {
      ip: '127.0.0.1',
      headers: { 'user-agent': 'Mozilla/5.0' },
    }
    const ctx = getRequestContext(req)
    expect(ctx.ipAddress).toBe('127.0.0.1')
    expect(ctx.userAgent).toBe('Mozilla/5.0')
  })

  it('falls back to x-forwarded-for when ip not set', () => {
    const req = {
      headers: { 'x-forwarded-for': '10.0.0.1', 'user-agent': 'test' },
    }
    const ctx = getRequestContext(req)
    expect(ctx.ipAddress).toBe('10.0.0.1')
  })

  it('returns undefined for missing values', () => {
    const ctx = getRequestContext({})
    expect(ctx.ipAddress).toBeUndefined()
    expect(ctx.userAgent).toBeUndefined()
  })
})
