import { mockDeep, mockReset } from 'jest-mock-extended'
import { PrismaClient } from '@prisma/client'

const mockPrisma = mockDeep<PrismaClient>()
jest.mock('../../src/config/database', () => ({ prisma: mockPrisma }))
jest.mock('../../src/lib/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }))
jest.mock('../../src/config/socket', () => ({
  pushNotification: jest.fn(),
  pushReminderDue: jest.fn(),
}))
jest.mock('../../src/services/pushNotification.service', () => ({
  sendPushToUser: jest.fn().mockResolvedValue(undefined),
}))
jest.mock('../../src/utils/distributedLock', () => ({
  acquireLock: jest.fn().mockResolvedValue(true),
  releaseLock: jest.fn().mockResolvedValue(undefined),
}))

import { processRemindersDue } from '../../src/jobs/reminderProcessor'
import { pushNotification, pushReminderDue } from '../../src/config/socket'

beforeEach(() => {
  mockReset(mockPrisma)
  jest.clearAllMocks()
})

describe('reminderProcessor job', () => {
  describe('processRemindersDue', () => {
    it('returns 0 processed when no due reminders', async () => {
      mockPrisma.followUpReminder.findMany.mockResolvedValue([])
      const result = await processRemindersDue()
      expect(result.processed).toBe(0)
    })

    it('skips when lock cannot be acquired', async () => {
      const { acquireLock } = require('../../src/utils/distributedLock')
      acquireLock.mockResolvedValueOnce(false)
      const result = await processRemindersDue()
      expect(result.processed).toBe(0)
    })

    it('processes due reminders and creates notifications', async () => {
      const dueReminder = {
        id: 'rem-1',
        title: 'Follow up call',
        note: 'Check on property interest',
        userId: 'user-1',
        leadId: 'lead-1',
        organizationId: 'org-1',
        channelInApp: true,
        channelEmail: false,
        channelSms: false,
        channelPush: false,
        lead: { id: 'lead-1', firstName: 'Jane', lastName: 'Smith', email: 'jane@test.com', phone: '555-1234' },
        user: { id: 'user-1', email: 'agent@test.com', firstName: 'Agent', phone: null, notificationSettings: null },
      }

      mockPrisma.followUpReminder.findMany.mockResolvedValue([dueReminder] as any)
      mockPrisma.notification.create.mockResolvedValue({
        id: 'notif-1',
        createdAt: new Date(),
      } as any)
      mockPrisma.followUpReminder.update.mockResolvedValue({} as any)

      const result = await processRemindersDue()
      expect(result.processed).toBe(1)
      expect(mockPrisma.notification.create).toHaveBeenCalled()
      expect(pushNotification).toHaveBeenCalledWith('user-1', expect.objectContaining({ type: 'REMINDER' }))
      expect(pushReminderDue).toHaveBeenCalled()
    })
  })
})
