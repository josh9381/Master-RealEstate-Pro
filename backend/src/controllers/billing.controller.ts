import { Request, Response } from 'express'
import { logger } from '../lib/logger'
import prisma from '../config/database'
import { getStripeService } from '../services/stripe.service'
import { STRIPE_PRICE_IDS, PLAN_FEATURES } from '../config/subscriptions'
import { SubscriptionTier } from '@prisma/client'

export const getSubscription = async (req: Request, res: Response) => {
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
        plan: subscription?.tier || org?.subscriptionTier || 'STARTER',
        status: subscription?.status || 'ACTIVE',
        currentPeriodEnd: subscription?.currentPeriodEnd || null,
        trialEndsAt: org?.trialEndsAt || null,
        stripeConfigured: !!process.env.STRIPE_SECRET_KEY,
      },
    })
  } catch (error) {
    logger.error('Get subscription error:', error)
    res.status(500).json({ success: false, message: 'Failed to fetch subscription status' })
  }
}

export const createCheckout = async (req: Request, res: Response) => {
  if (!process.env.STRIPE_SECRET_KEY) {
    res.status(501).json({
      success: false,
      message: 'Stripe not configured. Set STRIPE_SECRET_KEY to enable billing.',
    })
    return
  }

  try {
    const { planId } = req.body
    if (!planId) {
      res.status(400).json({ success: false, message: 'planId is required' })
      return
    }

    const tier = planId.toUpperCase() as SubscriptionTier
    if (tier === 'ENTERPRISE') {
      res.status(400).json({ success: false, message: 'Enterprise plans require contacting sales.' })
      return
    }

    const priceId = STRIPE_PRICE_IDS[tier as Exclude<SubscriptionTier, 'ENTERPRISE'>]
    if (!priceId) {
      res.status(400).json({ success: false, message: `No Stripe price configured for plan: ${planId}` })
      return
    }

    const stripe = getStripeService()
    const orgId = req.user!.organizationId

    // Ensure Subscription exists with a Stripe customer
    let sub = await prisma.subscription.findUnique({ where: { organizationId: orgId } })
    let customerId = sub?.stripeCustomerId

    if (!customerId) {
      const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { name: true, _count: false },
      })
      const user = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { email: true } })
      customerId = await stripe.createCustomer({
        email: user?.email || '',
        name: org?.name || '',
        metadata: { organizationId: orgId },
      })
    }

    if (!sub) {
      sub = await prisma.subscription.create({
        data: {
          organizationId: orgId,
          tier: 'STARTER',
          status: 'INCOMPLETE',
          stripeCustomerId: customerId,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(),
        },
      })
    } else if (!sub.stripeCustomerId) {
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { stripeCustomerId: customerId },
      })
    }

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
    const features = PLAN_FEATURES[tier]
    const trialDays = features?.trialDays || 0

    // If org already has a Stripe subscription, update it instead
    if (sub.stripeSubscriptionId) {
      await stripe.updateSubscription(sub.stripeSubscriptionId, priceId)
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { tier, stripePriceId: priceId },
      })
      await prisma.organization.update({
        where: { id: orgId },
        data: { subscriptionTier: tier },
      })
      res.json({
        success: true,
        data: { action: 'updated', message: `Subscription updated to ${tier}` },
      })
      return
    }

    const url = await stripe.createCheckoutSession(
      customerId,
      priceId,
      `${baseUrl}/billing?success=true`,
      `${baseUrl}/billing?canceled=true`,
    )

    // If trial is available, create subscription with trial instead of checkout
    if (trialDays > 0 && !sub.stripeSubscriptionId) {
      // The checkout session handles the trial via Stripe config
      logger.info(`Creating checkout with ${trialDays}-day trial for ${tier}`)
    }

    res.json({ success: true, data: { url } })
  } catch (error) {
    logger.error('Create checkout session error:', error)
    res.status(500).json({ success: false, message: 'Failed to create checkout session' })
  }
}

export const createPortal = async (req: Request, res: Response) => {
  if (!process.env.STRIPE_SECRET_KEY) {
    res.status(501).json({
      success: false,
      message: 'Stripe billing portal not configured.',
    })
    return
  }

  try {
    const sub = await prisma.subscription.findUnique({
      where: { organizationId: req.user!.organizationId },
      select: { stripeCustomerId: true },
    })

    if (!sub?.stripeCustomerId) {
      res.status(400).json({ success: false, message: 'No billing account found. Subscribe to a plan first.' })
      return
    }

    const stripe = getStripeService()
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
    const url = await stripe.createBillingPortal(sub.stripeCustomerId, `${baseUrl}/billing`)

    res.json({ success: true, data: { url } })
  } catch (error) {
    logger.error('Create billing portal error:', error)
    res.status(500).json({ success: false, message: 'Failed to create billing portal session' })
  }
}

export const getInvoices = async (req: Request, res: Response) => {
  try {
    const sub = await prisma.subscription.findUnique({
      where: { organizationId: req.user!.organizationId },
      select: {
        stripeCustomerId: true,
        Invoice: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    })

    // If Stripe is configured and we have a customer, fetch from Stripe
    if (process.env.STRIPE_SECRET_KEY && sub?.stripeCustomerId) {
      try {
        const stripe = getStripeService()
        const invoices = await stripe.listInvoices(sub.stripeCustomerId, 20)
        res.json({ success: true, data: invoices })
        return
      } catch (error) {
        logger.error('[BILLING] Failed to fetch Stripe invoices:', error)
        // Fall through to DB invoices
      }
    }

    res.json({
      success: true,
      data: sub?.Invoice || [],
    })
  } catch (error) {
    logger.error('Get invoices error:', error)
    res.json({ success: true, data: [] })
  }
}

export const getPaymentMethods = async (req: Request, res: Response) => {
  if (!process.env.STRIPE_SECRET_KEY) {
    res.json({ success: true, data: [] })
    return
  }

  try {
    const sub = await prisma.subscription.findUnique({
      where: { organizationId: req.user!.organizationId },
      select: { stripeCustomerId: true },
    })

    if (!sub?.stripeCustomerId) {
      res.json({ success: true, data: [] })
      return
    }

    // Payment methods would need direct Stripe SDK call
    // For now return empty; the portal handles payment method management
    res.json({ success: true, data: [] })
  } catch (error) {
    logger.error('Get payment methods error:', error)
    res.json({ success: true, data: [] })
  }
}
