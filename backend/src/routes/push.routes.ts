import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { getPublicKey, subscribe, unsubscribe } from '../controllers/pushSubscription.controller'

const router = Router()

// VAPID public key — no auth needed for initial setup
router.get('/vapid-key', getPublicKey)

// Subscribe/unsubscribe require auth
router.post('/subscribe', authenticate, subscribe)
router.delete('/subscribe', authenticate, unsubscribe)

export default router
