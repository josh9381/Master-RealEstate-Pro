import {
  createAppointmentSchema,
  updateAppointmentSchema,
  listAppointmentsQuerySchema,
  calendarQuerySchema,
  upcomingQuerySchema,
  sendReminderSchema,
} from '../../src/validators/appointment.validator'

describe('appointment.validator', () => {
  describe('createAppointmentSchema', () => {
    const future = new Date(Date.now() + 86400000).toISOString()
    const futureEnd = new Date(Date.now() + 90000000).toISOString()
    const valid = { title: 'Meeting', type: 'MEETING', startTime: future, endTime: futureEnd }

    it('accepts valid appointment', () => {
      expect(createAppointmentSchema.safeParse(valid).success).toBe(true)
    })

    it('rejects missing title', () => {
      const { title, ...rest } = valid
      expect(createAppointmentSchema.safeParse(rest).success).toBe(false)
    })

    it('rejects invalid type', () => {
      expect(createAppointmentSchema.safeParse({ ...valid, type: 'INVALID' }).success).toBe(false)
    })

    it('accepts all valid types', () => {
      ['CALL', 'MEETING', 'DEMO', 'CONSULTATION', 'FOLLOW_UP'].forEach((type) => {
        expect(createAppointmentSchema.safeParse({ ...valid, type }).success).toBe(true)
      })
    })

    it('rejects endTime before startTime', () => {
      expect(createAppointmentSchema.safeParse({
        ...valid,
        startTime: futureEnd,
        endTime: future,
      }).success).toBe(false)
    })

    it('accepts optional attendees', () => {
      expect(createAppointmentSchema.safeParse({
        ...valid,
        attendees: [{ email: 'a@b.com', name: 'Alice' }],
      }).success).toBe(true)
    })
  })

  describe('updateAppointmentSchema', () => {
    it('accepts partial updates', () => {
      expect(updateAppointmentSchema.safeParse({ title: 'Updated' }).success).toBe(true)
    })

    it('accepts status changes', () => {
      ['SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'].forEach((status) => {
        expect(updateAppointmentSchema.safeParse({ status }).success).toBe(true)
      })
    })
  })

  describe('listAppointmentsQuerySchema', () => {
    it('applies defaults', () => {
      const res = listAppointmentsQuerySchema.safeParse({})
      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.data.page).toBe(1)
        expect(res.data.limit).toBe(20)
      }
    })

    it('rejects limit over 100', () => {
      expect(listAppointmentsQuerySchema.safeParse({ limit: 101 }).success).toBe(false)
    })
  })

  describe('calendarQuerySchema', () => {
    const start = '2026-01-01T00:00:00Z'
    const end = '2026-01-31T00:00:00Z'

    it('accepts valid range', () => {
      expect(calendarQuerySchema.safeParse({ startDate: start, endDate: end }).success).toBe(true)
    })

    it('rejects endDate before startDate', () => {
      expect(calendarQuerySchema.safeParse({ startDate: end, endDate: start }).success).toBe(false)
    })

    it('defaults view to week', () => {
      const res = calendarQuerySchema.safeParse({ startDate: start, endDate: end })
      if (res.success) expect(res.data.view).toBe('week')
    })
  })

  describe('upcomingQuerySchema', () => {
    it('applies defaults', () => {
      const res = upcomingQuerySchema.safeParse({})
      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.data.days).toBe(7)
        expect(res.data.limit).toBe(10)
      }
    })

    it('rejects days over 90', () => {
      expect(upcomingQuerySchema.safeParse({ days: 91 }).success).toBe(false)
    })
  })

  describe('sendReminderSchema', () => {
    it('defaults to email', () => {
      const res = sendReminderSchema.safeParse({})
      expect(res.success).toBe(true)
      if (res.success) expect(res.data.method).toBe('email')
    })

    it('accepts all methods', () => {
      ['email', 'sms', 'both'].forEach((method) => {
        expect(sendReminderSchema.safeParse({ method }).success).toBe(true)
      })
    })
  })
})
