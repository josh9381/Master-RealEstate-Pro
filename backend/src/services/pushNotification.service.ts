import webpush from 'web-push'
import { prisma } from '../config/database'
import { logger } from '../lib/logger'

// Configure web-push with VAPID keys
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || ''
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || ''
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@masterrealestatepro.com'

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
  logger.info('Web Push VAPID configured')
} else {
  logger.warn('VAPID keys not configured — push notifications disabled')
}

export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY
}

interface PushPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  url?: string
  tag?: string
  data?: Record<string, unknown>
}

/**
 * Send a push notification to all of a user's subscribed devices.
 * Automatically cleans up invalid subscriptions (410 Gone, 404).
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<{ sent: number; failed: number }> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    logger.debug('Push notification skipped — VAPID not configured')
    return { sent: 0, failed: 0 }
  }

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  })

  if (subscriptions.length === 0) {
    logger.debug({ userId }, 'No push subscriptions found for user')
    return { sent: 0, failed: 0 }
  }

  let sent = 0
  let failed = 0
  const invalidIds: string[] = []

  const notificationPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || '/icons/icon-192x192.png',
    badge: payload.badge || '/icons/badge-72x72.png',
    data: {
      url: payload.url || '/',
      ...payload.data,
    },
    tag: payload.tag,
  })

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        notificationPayload,
        { TTL: 86400 } // 24 hours
      )
      sent++
    } catch (error: unknown) {
      const statusCode = (error as { statusCode?: number })?.statusCode
      if (statusCode === 410 || statusCode === 404) {
        // Subscription expired or invalid — mark for cleanup
        invalidIds.push(sub.id)
        logger.info({ subId: sub.id, userId }, 'Push subscription expired, removing')
      } else {
        logger.error({ error, subId: sub.id, userId }, 'Failed to send push notification')
      }
      failed++
    }
  }

  // Clean up invalid subscriptions
  if (invalidIds.length > 0) {
    await prisma.pushSubscription.deleteMany({
      where: { id: { in: invalidIds } },
    })
  }

  logger.info({ userId, sent, failed, cleaned: invalidIds.length }, 'Push notifications delivered')
  return { sent, failed }
}
