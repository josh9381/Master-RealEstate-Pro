jest.mock('../../src/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }
}))

const mockStripe = {
  customers: {
    create: jest.fn(),
  },
  subscriptions: {
    create: jest.fn(),
    retrieve: jest.fn(),
    update: jest.fn(),
    cancel: jest.fn(),
  },
}

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => mockStripe)
})

// Set env before import
process.env.STRIPE_SECRET_KEY = 'sk_test_fake'

import { StripeService } from '../../src/services/stripe.service'

describe('stripe.service', () => {
  let service: StripeService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new StripeService()
  })

  describe('createCustomer', () => {
    it('creates a customer and returns id', async () => {
      mockStripe.customers.create.mockResolvedValue({ id: 'cus_123' })

      const result = await service.createCustomer({
        email: 'test@example.com',
        name: 'Test User',
      })
      expect(result).toBe('cus_123')
      expect(mockStripe.customers.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'test@example.com', name: 'Test User' })
      )
    })

    it('throws on Stripe API error', async () => {
      mockStripe.customers.create.mockRejectedValue(new Error('Stripe error'))
      await expect(
        service.createCustomer({ email: 'test@example.com', name: 'Test' })
      ).rejects.toThrow(/Failed to create customer/)
    })
  })

  describe('createSubscription', () => {
    it('creates a subscription and returns id', async () => {
      mockStripe.subscriptions.create.mockResolvedValue({
        id: 'sub_123',
        latest_invoice: { payment_intent: { client_secret: 'cs_test' } },
      })

      const result = await service.createSubscription({
        customerId: 'cus_123',
        priceId: 'price_123',
      })
      expect(typeof result).toBe('string')
    })
  })
})
