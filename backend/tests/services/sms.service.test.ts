import { mockDeep, mockReset } from 'jest-mock-extended'
import type { PrismaClient } from '@prisma/client'
import twilio from 'twilio'

const mockPrisma = mockDeep<PrismaClient>()
jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: mockPrisma,
  prisma: mockPrisma,
}))

jest.mock('twilio', () => {
  const create = jest.fn()
  const factory = jest.fn(() => ({ messages: { create } }))
  Object.assign(factory, { __create: create })
  return { __esModule: true, default: factory }
})

jest.mock('handlebars', () => ({
  __esModule: true,
  default: {
    compile: jest.fn(() => jest.fn(() => 'Compiled message')),
  },
}))

jest.mock('../../src/utils/encryption', () => ({
  decryptForUser: jest.fn((_userId: string, val: string) => val),
}))

jest.mock('../../src/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}))

import { sendSMS, sendTemplateSMS } from '../../src/services/sms.service'

// jest.setup.ts sets TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN, so twilioClient is
// the mock instance returned by twilio(). Get a handle to its messages.create mock.
const getTwilioCreate = (): jest.Mock => (twilio as unknown as { __create: jest.Mock }).__create

describe('sendSMS', () => {
  const baseOptions = {
    to: '+15551234567',
    message: 'Hello there!',
    organizationId: 'org-1',
  }

  beforeEach(() => {
    mockReset(mockPrisma)
    mockPrisma.sMSConfig.findUnique.mockResolvedValue(null)
    mockPrisma.message.create.mockResolvedValue({ id: 'msg-1' } as never)
    // Set up Twilio mock to return a valid message
    getTwilioCreate().mockReset()
    getTwilioCreate().mockResolvedValue({ sid: 'SM_test_123', status: 'queued', numSegments: '1' })
  })

  it('returns error when lead has opted out of SMS', async () => {
    mockPrisma.lead.findUnique.mockResolvedValue({
      smsOptOutAt: new Date(),
      phone: '+15551234567',
    } as never)
    const result = await sendSMS({ ...baseOptions, leadId: 'lead-1' })
    expect(result.success).toBe(false)
    expect(result.error).toContain('opted out')
  })

  it('does not check opt-out when no leadId provided', async () => {
    const result = await sendSMS({ ...baseOptions })
    expect(mockPrisma.lead.findUnique).not.toHaveBeenCalled()
    expect(result.success).toBe(true)
  })

  it('sends SMS via Twilio when configured', async () => {
    const result = await sendSMS({ ...baseOptions })
    expect(result.success).toBe(true)
    expect(getTwilioCreate()).toHaveBeenCalledWith(
      expect.objectContaining({ body: 'Hello there!', to: '+15551234567' })
    )
  })

  it('creates a message record in database', async () => {
    await sendSMS({ ...baseOptions })
    expect(mockPrisma.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'SMS',
          direction: 'OUTBOUND',
          organizationId: 'org-1',
        }),
      })
    )
  })

  it('passes leadId to message record when opt-in (no opt-out)', async () => {
    mockPrisma.lead.findUnique.mockResolvedValue({ smsOptOutAt: null, phone: '+15551234567' } as never)
    await sendSMS({ ...baseOptions, leadId: 'lead-42' })
    expect(mockPrisma.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ leadId: 'lead-42' }),
      })
    )
  })

  it('returns failure on Twilio error', async () => {
    getTwilioCreate().mockRejectedValue(new Error('Twilio API error'))
    const result = await sendSMS({ ...baseOptions })
    expect(result.success).toBe(false)
    expect(result.error).toContain('Twilio API error')
  })
})

describe('sendTemplateSMS', () => {
  beforeEach(() => {
    mockReset(mockPrisma)
    mockPrisma.sMSConfig.findUnique.mockResolvedValue(null)
    mockPrisma.message.create.mockResolvedValue({ id: 'msg-1' } as never)
    mockPrisma.sMSTemplate.update.mockResolvedValue({} as never)
    getTwilioCreate().mockReset()
    getTwilioCreate().mockResolvedValue({ sid: 'SM_test_123', status: 'queued', numSegments: '1' })
  })

  it('returns error when template not found', async () => {
    mockPrisma.sMSTemplate.findUnique.mockResolvedValue(null)
    const result = await sendTemplateSMS('tmpl-999', '+15551234567', {}, { organizationId: 'org-1' })
    expect(result.success).toBe(false)
    expect(result.error).toContain('not found')
  })

  it('returns error when template is not active', async () => {
    mockPrisma.sMSTemplate.findUnique.mockResolvedValue({ id: 'tmpl-1', body: 'Hi', isActive: false } as never)
    const result = await sendTemplateSMS('tmpl-1', '+15551234567', {}, { organizationId: 'org-1' })
    expect(result.success).toBe(false)
    expect(result.error).toContain('not active')
  })

  it('sends SMS when template is active', async () => {
    mockPrisma.sMSTemplate.findUnique.mockResolvedValue({ id: 'tmpl-1', body: 'Hi {{name}}', isActive: true } as never)
    const result = await sendTemplateSMS('tmpl-1', '+15551234567', { name: 'Alice' }, { organizationId: 'org-1' })
    expect(result.success).toBe(true)
  })

  it('increments template usage count', async () => {
    mockPrisma.sMSTemplate.findUnique.mockResolvedValue({ id: 'tmpl-1', body: 'Hi', isActive: true } as never)
    await sendTemplateSMS('tmpl-1', '+15551234567', {}, { organizationId: 'org-1' })
    expect(mockPrisma.sMSTemplate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'tmpl-1' },
        data: expect.objectContaining({ usageCount: { increment: 1 } }),
      })
    )
  })
})
