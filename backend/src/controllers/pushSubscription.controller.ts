import { Request, Response } from 'express'
import { prisma } from '../config/database'
import { UnauthorizedError } from '../middleware/errorHandler'
import { getVapidPublicKey } from '../services/pushNotification.service'

/**
 * Get the VAPID public key — needed by the frontend to subscribe
 * GET /api/push/vapid-key
 */
export async function getPublicKey(req: Request, res: Response): Promise<void> {
  const key = getVapidPublicKey()
  res.status(200).json({ success: true, data: { publicKey: key } })
}

/**
 * Subscribe to push notifications on this device
 * POST /api/push/subscribe
 */
export async function subscribe(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new UnauthorizedError('Authentication required')

  const { endpoint, keys } = req.body

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    res.status(400).json({ success: false, error: 'Invalid push subscription object' })
    return
  }

  // Upsert — same endpoint = same device, just update keys
  const subscription = await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: {
      p256dh: keys.p256dh,
      auth: keys.auth,
      userAgent: req.get('user-agent') || null,
    },
    create: {
      userId: req.user.userId,
      organizationId: req.user.organizationId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      userAgent: req.get('user-agent') || null,
    },
  })

  res.status(201).json({ success: true, data: { id: subscription.id } })
}

/**
 * Unsubscribe from push notifications on this device
 * DELETE /api/push/subscribe
 */
export async function unsubscribe(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new UnauthorizedError('Authentication required')

  const { endpoint } = req.body

  if (!endpoint) {
    res.status(400).json({ success: false, error: 'Endpoint is required' })
    return
  }

  await prisma.pushSubscription.deleteMany({
    where: {
      endpoint,
      userId: req.user.userId,
    },
  })

  res.status(200).json({ success: true })
}
