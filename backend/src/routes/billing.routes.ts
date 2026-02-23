import { Router, Request, Response } from 'express'
import { authenticate } from '../middleware/auth'
import prisma from '../config/database'

const router = Router()

// All billing routes require authentication
router.use(authenticate)

/**
 * @route   GET /api/billing/subscription
 * @desc    Get current subscription status from organization
 * @access  Private
 */
router.get('/subscription', async (req: Request, res: Response) => {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: req.user!.organizationId },
      select: {
        subscriptionTier: true,
        subscriptionId: true,
        trialEndsAt: true,
        Subscription: {
          select: {
            tier: true,
            status: true,
            currentPeriodEnd: true,
            stripeCustomerId: true,
            stripeSubscriptionId: true,
          },
        },
      },
    })

    const subscription = org?.Subscription
    res.json({
      success: true,
      data: {
        plan: subscription?.tier || org?.subscriptionTier || 'FREE',
        status: subscription?.status || 'ACTIVE',
        currentPeriodEnd: subscription?.currentPeriodEnd || null,
        trialEndsAt: org?.trialEndsAt || null,
        stripeConfigured: !!process.env.STRIPE_SECRET_KEY,
      },
    })
  } catch (error) {
    console.error('Get subscription error:', error)
    res.status(500).json({ success: false, message: 'Failed to fetch subscription status' })
  }
})

/**
 * @route   POST /api/billing/checkout
 * @desc    Create a Stripe checkout session for plan upgrade
 * @access  Private
 */
router.post('/checkout', async (req: Request, res: Response) => {
  if (!process.env.STRIPE_SECRET_KEY) {
    res.status(501).json({
      success: false,
      message: 'Stripe checkout not configured. Set STRIPE_SECRET_KEY in environment variables to enable billing.',
    })
    return
  }

  try {
    const { planId } = req.body
    if (!planId) {
      res.status(400).json({ success: false, message: 'planId is required' })
      return
    }

    // TODO: Implement actual Stripe checkout session creation
    // using getStripeService().createCheckoutSession(...)
    res.status(501).json({
      success: false,
      message: 'Stripe checkout session creation not yet fully implemented. Configure Stripe price IDs.',
    })
  } catch (error) {
    console.error('Create checkout session error:', error)
    res.status(500).json({ success: false, message: 'Failed to create checkout session' })
  }
})

/**
 * @route   POST /api/billing/portal
 * @desc    Create a Stripe billing portal session
 * @access  Private
 */
router.post('/portal', async (req: Request, res: Response) => {
  if (!process.env.STRIPE_SECRET_KEY) {
    res.status(501).json({
      success: false,
      message: 'Stripe billing portal not configured. Set STRIPE_SECRET_KEY in environment variables to enable billing management.',
    })
    return
  }

  try {
    // TODO: Implement actual Stripe billing portal session
    // using getStripeService().createBillingPortal(...)
    res.status(501).json({
      success: false,
      message: 'Stripe billing portal not yet fully implemented.',
    })
  } catch (error) {
    console.error('Create billing portal error:', error)
    res.status(500).json({ success: false, message: 'Failed to create billing portal session' })
  }
})

/**
 * @route   GET /api/billing/invoices
 * @desc    Get invoices for the organization
 * @access  Private
 */
router.get('/invoices', async (req: Request, res: Response) => {
  try {
    // Try to fetch invoices from the database first
    const subscription = await prisma.subscription.findUnique({
      where: { organizationId: req.user!.organizationId },
      select: {
        Invoice: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    })

    res.json({
      success: true,
      data: subscription?.Invoice || [],
    })
  } catch (error) {
    console.error('Get invoices error:', error)
    // Gracefully return empty array if Invoice model doesn't exist yet
    res.json({ success: true, data: [] })
  }
})

/**
 * @route   GET /api/billing/payment-methods
 * @desc    Get payment methods for the organization
 * @access  Private
 */
router.get('/payment-methods', async (req: Request, res: Response) => {
  if (!process.env.STRIPE_SECRET_KEY) {
    // No Stripe configured — return empty array gracefully
    res.json({
      success: true,
      data: [],
      message: 'Stripe not configured. No payment methods available.',
    })
    return
  }

  try {
    // TODO: Implement Stripe payment methods retrieval
    // const subscription = await prisma.subscription.findUnique(...)
    // const methods = await stripe.paymentMethods.list({ customer: subscription.stripeCustomerId })
    res.json({ success: true, data: [] })
  } catch (error) {
    console.error('Get payment methods error:', error)
    res.json({ success: true, data: [] })
  }
})

export default router
