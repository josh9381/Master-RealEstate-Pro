import { prisma } from '../config/database'
import { logger } from '../lib/logger'
import { pushNotification, pushReminderDue } from '../config/socket'
import { sendPushToUser } from '../services/pushNotification.service'

/**
 * Process due follow-up reminders.
 * Called by node-cron every minute.
 *
 * For each reminder that is PENDING and past its dueAt:
 * 1. Create an in-app Notification (always)
 * 2. Emit real-time socket event (always)
 * 3. If channelEmail → send email via existing email infra
 * 4. If channelSms → send SMS via existing SMS infra
 * 5. If channelPush → send browser push notification
 * 6. Update reminder status to FIRED
 */
export async function processRemindersDue(): Promise<{ processed: number }> {
  const now = new Date()

  // Find all PENDING or SNOOZED reminders that are past due
  const dueReminders = await prisma.followUpReminder.findMany({
    where: {
      status: { in: ['PENDING', 'SNOOZED'] },
      dueAt: { lte: now },
    },
    include: {
      lead: {
        select: { id: true, firstName: true, lastName: true, email: true, phone: true },
      },
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          phone: true,
          notificationSettings: true,
        },
      },
    },
    take: 100, // Process in batches
  })

  if (dueReminders.length === 0) return { processed: 0 }

  logger.info({ count: dueReminders.length }, 'Processing due follow-up reminders')

  let processed = 0

  for (const reminder of dueReminders) {
    try {
      const leadName = `${reminder.lead.firstName} ${reminder.lead.lastName}`
      const notifTitle = `Follow-up: ${reminder.title}`
      const notifMessage = `Reminder to follow up with ${leadName}${reminder.note ? ` — ${reminder.note}` : ''}`

      // 1. Always create in-app notification
      if (reminder.channelInApp) {
        const notification = await prisma.notification.create({
          data: {
            userId: reminder.userId,
            organizationId: reminder.organizationId,
            type: 'REMINDER',
            title: notifTitle,
            message: notifMessage,
            link: `/leads/${reminder.leadId}`,
          },
        })

        // 2. Real-time socket push
        pushNotification(reminder.userId, {
          id: notification.id,
          type: 'REMINDER',
          title: notifTitle,
          message: notifMessage,
          read: false,
          createdAt: notification.createdAt.toISOString(),
          data: { leadId: reminder.leadId, reminderId: reminder.id },
        })

        // 2b. Dedicated reminder event for query cache invalidation
        pushReminderDue(reminder.organizationId, {
          reminderId: reminder.id,
          leadId: reminder.leadId,
          userId: reminder.userId,
        })
      }

      // 3. Email notification
      if (reminder.channelEmail && reminder.user.email) {
        try {
          const emailConfig = await prisma.emailConfig.findUnique({
            where: { userId: reminder.userId },
          })

          if (emailConfig?.isActive) {
            const { sendEmail } = await import('../services/email.service')
            await sendEmail({
              to: reminder.user.email,
              subject: notifTitle,
              html: `
                <h2>${notifTitle}</h2>
                <p>${notifMessage}</p>
                <p><strong>Lead:</strong> ${leadName}</p>
                ${reminder.lead.email ? `<p><strong>Email:</strong> ${reminder.lead.email}</p>` : ''}
                ${reminder.lead.phone ? `<p><strong>Phone:</strong> ${reminder.lead.phone}</p>` : ''}
                <p style="margin-top: 20px;">
                  <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/leads/${reminder.leadId}" 
                     style="background: #3B82F6; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none;">
                    View Lead
                  </a>
                </p>
              `,
              userId: reminder.userId,
              organizationId: reminder.organizationId,
              skipSuppressionCheck: true,
            })
            logger.info({ reminderId: reminder.id, channel: 'email' }, 'Reminder email sent')
          }
        } catch (emailErr) {
          logger.warn({ reminderId: reminder.id, error: emailErr }, 'Failed to send reminder email (non-blocking)')
        }
      }

      // 4. SMS notification
      if (reminder.channelSms && reminder.user.phone) {
        try {
          const smsConfig = await prisma.sMSConfig.findUnique({
            where: { userId: reminder.userId },
          })

          if (smsConfig?.isActive) {
            const { sendSMS } = await import('../services/sms.service')
            await sendSMS({
              to: reminder.user.phone,
              message: `${notifTitle}: Follow up with ${leadName}. ${reminder.note || ''}`.trim(),
              userId: reminder.userId,
              organizationId: reminder.organizationId,
            })
            logger.info({ reminderId: reminder.id, channel: 'sms' }, 'Reminder SMS sent')
          }
        } catch (smsErr) {
          logger.warn({ reminderId: reminder.id, error: smsErr }, 'Failed to send reminder SMS (non-blocking)')
        }
      }

      // 5. Browser push notification
      if (reminder.channelPush) {
        try {
          await sendPushToUser(reminder.userId, {
            title: notifTitle,
            body: notifMessage,
            url: `/leads/${reminder.leadId}`,
            tag: `reminder-${reminder.id}`,
            data: { leadId: reminder.leadId, reminderId: reminder.id },
          })
          logger.info({ reminderId: reminder.id, channel: 'push' }, 'Reminder push sent')
        } catch (pushErr) {
          logger.warn({ reminderId: reminder.id, error: pushErr }, 'Failed to send reminder push (non-blocking)')
        }
      }

      // 6. Mark reminder as FIRED
      await prisma.followUpReminder.update({
        where: { id: reminder.id },
        data: { status: 'FIRED', firedAt: now },
      })

      // 7. Spawn next occurrence if recurring
      if ((reminder as any).isRecurring && (reminder as any).recurrencePattern) {
        try {
          await spawnNextRecurrence(reminder as any, now)
        } catch (recErr) {
          logger.warn({ reminderId: reminder.id, error: recErr }, 'Failed to spawn next recurrence (non-blocking)')
        }
      }

      processed++
    } catch (err) {
      logger.error({ reminderId: reminder.id, error: err }, 'Failed to process reminder')
    }
  }

  logger.info({ processed }, 'Reminder processing complete')
  return { processed }
}

/**
 * Calculate the next due date for a recurring reminder and create a new occurrence.
 */
async function spawnNextRecurrence(reminder: any, firedAt: Date): Promise<void> {
  const currentOccurrence = reminder.occurrenceNumber || 0
  const nextOccurrence = currentOccurrence + 1

  // Check max occurrence count
  if (reminder.recurrenceCount && nextOccurrence >= reminder.recurrenceCount) {
    logger.info({ reminderId: reminder.id }, 'Max recurrence count reached, not spawning next')
    return
  }

  const nextDue = calculateNextDueDate(new Date(reminder.dueAt), reminder.recurrencePattern, reminder.recurrenceInterval)

  // Check end date
  if (reminder.recurrenceEndDate && nextDue > new Date(reminder.recurrenceEndDate)) {
    logger.info({ reminderId: reminder.id }, 'Recurrence end date passed, not spawning next')
    return
  }

  const parentId = reminder.parentReminderId || reminder.id

  await prisma.followUpReminder.create({
    data: {
      leadId: reminder.leadId,
      userId: reminder.userId,
      organizationId: reminder.organizationId,
      title: reminder.title,
      note: reminder.note,
      dueAt: nextDue,
      priority: reminder.priority,
      channelInApp: reminder.channelInApp,
      channelEmail: reminder.channelEmail,
      channelSms: reminder.channelSms,
      channelPush: reminder.channelPush,
      isRecurring: true,
      recurrencePattern: reminder.recurrencePattern,
      recurrenceInterval: reminder.recurrenceInterval,
      recurrenceEndDate: reminder.recurrenceEndDate,
      recurrenceCount: reminder.recurrenceCount,
      occurrenceNumber: nextOccurrence,
      parentReminderId: parentId,
      status: 'PENDING',
    },
  })

  logger.info({ parentId, occurrence: nextOccurrence, nextDue }, 'Spawned next recurring reminder')
}

function calculateNextDueDate(currentDue: Date, pattern: string, customInterval?: number | null): Date {
  const next = new Date(currentDue)

  switch (pattern) {
    case 'DAILY':
      next.setDate(next.getDate() + 1)
      break
    case 'WEEKLY':
      next.setDate(next.getDate() + 7)
      break
    case 'BIWEEKLY':
      next.setDate(next.getDate() + 14)
      break
    case 'MONTHLY':
      next.setMonth(next.getMonth() + 1)
      break
    case 'QUARTERLY':
      next.setMonth(next.getMonth() + 3)
      break
    case 'YEARLY':
      next.setFullYear(next.getFullYear() + 1)
      break
    case 'CUSTOM':
      next.setDate(next.getDate() + (customInterval || 1))
      break
    default:
      next.setDate(next.getDate() + 1)
  }

  return next
}
