import { mockDeep, mockReset } from 'jest-mock-extended'
import { PrismaClient } from '@prisma/client'

const mockPrisma = mockDeep<PrismaClient>()
jest.mock('../../src/config/database', () => ({
  __esModule: true,
  prisma: mockPrisma,
}))

jest.mock('../../src/lib/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }))
jest.mock('../../src/services/email.service', () => ({ sendEmail: jest.fn() }))
jest.mock('../../src/services/sms.service', () => ({ sendSMS: jest.fn() }))

import { sendAppointmentReminder } from '../../src/services/reminder.service'
import { sendEmail } from '../../src/services/email.service'
import { sendSMS } from '../../src/services/sms.service'

const mockSendEmail = sendEmail as jest.Mock
const mockSendSMS = sendSMS as jest.Mock

const makeAppointment = (overrides: Record<string, unknown> = {}) => ({
  id: 'appt1',
  title: 'Property Tour',
  type: 'viewing',
  startTime: new Date('2025-06-01T14:00:00Z'),
  location: '123 Main St',
  meetingUrl: null,
  description: 'Property walkthrough',
  attendees: [],
  organizationId: 'org1',
  lead: {
    id: 'lead1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '+15551234567',
    organizationId: 'org1',
  },
  user: { id: 'user1', firstName: 'Agent', lastName: 'Smith', email: 'agent@re.com' },
  ...overrides,
})

describe('reminder.service', () => {
  beforeEach(() => {
    mockReset(mockPrisma)
    mockSendEmail.mockReset()
    mockSendSMS.mockReset()
  })

  it('throws when appointment not found', async () => {
    ;(mockPrisma.appointment.findUnique as jest.Mock).mockResolvedValue(null)
    await expect(sendAppointmentReminder({ appointmentId: 'nope', method: 'email' })).rejects.toThrow('Appointment not found')
  })

  it('sends email reminder when method=email', async () => {
    ;(mockPrisma.appointment.findUnique as jest.Mock).mockResolvedValue(makeAppointment())
    mockSendEmail.mockResolvedValue({ success: true })

    const result = await sendAppointmentReminder({ appointmentId: 'appt1', method: 'email' })

    expect(mockSendEmail).toHaveBeenCalledTimes(1)
    expect(mockSendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'john@example.com',
      subject: expect.stringContaining('Property Tour'),
    }))
    expect(result.email).toBe(true)
    expect(result.sms).toBeUndefined()
  })

  it('sends SMS reminder when method=sms', async () => {
    ;(mockPrisma.appointment.findUnique as jest.Mock).mockResolvedValue(makeAppointment())
    mockSendSMS.mockResolvedValue({ success: true })

    const result = await sendAppointmentReminder({ appointmentId: 'appt1', method: 'sms' })

    expect(mockSendSMS).toHaveBeenCalledTimes(1)
    expect(mockSendSMS).toHaveBeenCalledWith(expect.objectContaining({ to: '+15551234567' }))
    expect(result.sms).toBe(true)
    expect(result.email).toBeUndefined()
  })

  it('sends both email and SMS when method=both', async () => {
    ;(mockPrisma.appointment.findUnique as jest.Mock).mockResolvedValue(makeAppointment())
    mockSendEmail.mockResolvedValue({})
    mockSendSMS.mockResolvedValue({})

    const result = await sendAppointmentReminder({ appointmentId: 'appt1', method: 'both' })

    expect(mockSendEmail).toHaveBeenCalled()
    expect(mockSendSMS).toHaveBeenCalled()
    expect(result.email).toBe(true)
    expect(result.sms).toBe(true)
  })

  it('returns email=false when lead has no email', async () => {
    ;(mockPrisma.appointment.findUnique as jest.Mock).mockResolvedValue(
      makeAppointment({ lead: { id: 'l1', firstName: 'X', lastName: 'Y', email: null, phone: null, organizationId: 'org1' } })
    )

    const result = await sendAppointmentReminder({ appointmentId: 'appt1', method: 'email' })

    expect(mockSendEmail).not.toHaveBeenCalled()
    expect(result.email).toBe(false)
  })

  it('returns sms=false when lead has no phone', async () => {
    ;(mockPrisma.appointment.findUnique as jest.Mock).mockResolvedValue(
      makeAppointment({ lead: { id: 'l1', firstName: 'X', lastName: 'Y', email: 'x@x.com', phone: null, organizationId: 'org1' } })
    )

    const result = await sendAppointmentReminder({ appointmentId: 'appt1', method: 'sms' })

    expect(mockSendSMS).not.toHaveBeenCalled()
    expect(result.sms).toBe(false)
  })

  it('returns email=false and catches sendEmail failure gracefully', async () => {
    ;(mockPrisma.appointment.findUnique as jest.Mock).mockResolvedValue(makeAppointment())
    mockSendEmail.mockRejectedValue(new Error('SMTP failure'))

    const result = await sendAppointmentReminder({ appointmentId: 'appt1', method: 'email' })

    expect(result.email).toBe(false)
  })

  it('supports custom message in email body', async () => {
    ;(mockPrisma.appointment.findUnique as jest.Mock).mockResolvedValue(makeAppointment())
    mockSendEmail.mockResolvedValue({})

    await sendAppointmentReminder({ appointmentId: 'appt1', method: 'email', customMessage: 'Your custom note here' })

    const emailCall = mockSendEmail.mock.calls[0][0]
    expect(emailCall.html).toContain('Your custom note here')
  })
})
