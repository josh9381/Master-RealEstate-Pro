import { createNoteSchema, updateNoteSchema, noteIdSchema } from '../../src/validators/note.validator'
import { createNotificationSchema, notificationIdParamSchema } from '../../src/validators/notification.validator'
import { createSavedReportSchema, updateSavedReportSchema, reportIdParamSchema } from '../../src/validators/savedReport.validator'

describe('note.validator', () => {
  describe('createNoteSchema', () => {
    it('accepts valid note', () => {
      expect(createNoteSchema.safeParse({ content: 'Some notes' }).success).toBe(true)
    })

    it('rejects empty content', () => {
      expect(createNoteSchema.safeParse({ content: '' }).success).toBe(false)
    })

    it('rejects content over 10000 chars', () => {
      expect(createNoteSchema.safeParse({ content: 'x'.repeat(10001) }).success).toBe(false)
    })
  })

  describe('updateNoteSchema', () => {
    it('accepts valid update', () => {
      expect(updateNoteSchema.safeParse({ content: 'Updated' }).success).toBe(true)
    })
  })

  describe('noteIdSchema', () => {
    it('accepts non-empty id', () => {
      expect(noteIdSchema.safeParse({ id: 'abc' }).success).toBe(true)
    })
  })
})

describe('notification.validator', () => {
  describe('createNotificationSchema', () => {
    it('accepts valid notification', () => {
      expect(createNotificationSchema.safeParse({ title: 'New Lead', message: 'A new lead was created' }).success).toBe(true)
    })

    it('rejects missing title', () => {
      expect(createNotificationSchema.safeParse({ message: 'body' }).success).toBe(false)
    })

    it('accepts valid type', () => {
      expect(createNotificationSchema.safeParse({
        title: 'T', message: 'M', type: 'lead_assigned',
      }).success).toBe(true)
    })

    it('accepts link URL', () => {
      expect(createNotificationSchema.safeParse({
        title: 'T', message: 'M', link: 'https://example.com',
      }).success).toBe(true)
    })

    it('accepts empty string link', () => {
      expect(createNotificationSchema.safeParse({
        title: 'T', message: 'M', link: '',
      }).success).toBe(true)
    })
  })

  describe('notificationIdParamSchema', () => {
    it('accepts non-empty id', () => {
      expect(notificationIdParamSchema.safeParse({ id: 'abc' }).success).toBe(true)
    })
  })
})

describe('savedReport.validator', () => {
  describe('createSavedReportSchema', () => {
    it('accepts valid report', () => {
      expect(createSavedReportSchema.safeParse({ name: 'Monthly Report', config: { chart: 'bar' } }).success).toBe(true)
    })

    it('rejects missing name', () => {
      expect(createSavedReportSchema.safeParse({ config: {} }).success).toBe(false)
    })

    it('accepts report without config', () => {
      expect(createSavedReportSchema.safeParse({ name: 'X' }).success).toBe(true)
    })
  })

  describe('updateSavedReportSchema', () => {
    it('accepts partial update', () => {
      expect(updateSavedReportSchema.safeParse({ name: 'Updated' }).success).toBe(true)
    })
  })

  describe('reportIdParamSchema', () => {
    it('accepts non-empty id', () => {
      expect(reportIdParamSchema.safeParse({ id: 'abc' }).success).toBe(true)
    })
  })
})
