import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import {
  getSubscription,
  createCheckout,
  createPortal,
  getInvoices,
  getPaymentMethods,
} from '../controllers/billing.controller'

const router = Router()

router.use(authenticate)

router.get('/subscription', getSubscription)
router.post('/checkout', createCheckout)
router.post('/portal', createPortal)
router.get('/invoices', getInvoices)
router.get('/payment-methods', getPaymentMethods)

export default router
