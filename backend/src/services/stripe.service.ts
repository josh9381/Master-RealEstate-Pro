import Stripe from 'stripe';

/**
 * Stripe Service
 * Handles subscriptions, billing, and payment processing
 * Phase 4 implementation
 */

interface SubscriptionOptions {
  customerId: string;
  priceId: string;
  metadata?: Record<string, string>;
  trialDays?: number;
}

interface CustomerOptions {
  email: string;
  name: string;
  metadata?: Record<string, string>;
}

interface SubscriptionDetails {
  id: string;
  status: string;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  items: Array<{
    priceId: string;
    quantity: number;
  }>;
}

export class StripeService {
  private stripe: Stripe;

  constructor() {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }

    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-10-29.clover',
      typescript: true,
    });
  }

  /**
   * Create a Stripe customer
   * @param options - Customer information
   * @returns Customer ID
   */
  async createCustomer(options: CustomerOptions): Promise<string> {
    try {
      const customer = await this.stripe.customers.create({
        email: options.email,
        name: options.name,
        metadata: options.metadata,
      });

      return customer.id;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Stripe create customer error:', error);
      throw new Error(`Failed to create customer: ${errorMessage}`);
    }
  }

  /**
   * Create a subscription
   * @param options - Subscription options
   * @returns Subscription ID
   */
  async createSubscription(options: SubscriptionOptions): Promise<string> {
    try {
      const subscriptionData: Stripe.SubscriptionCreateParams = {
        customer: options.customerId,
        items: [{ price: options.priceId }],
        metadata: options.metadata,
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
      };

      if (options.trialDays) {
        subscriptionData.trial_period_days = options.trialDays;
      }

      const subscription = await this.stripe.subscriptions.create(subscriptionData);

      return subscription.id;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Stripe create subscription error:', error);
      throw new Error(`Failed to create subscription: ${errorMessage}`);
    }
  }

  /**
   * Get subscription details
   * @param subscriptionId - Subscription ID
   * @returns Subscription details
   */
  async getSubscription(subscriptionId: string): Promise<SubscriptionDetails> {
    try {
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId) as unknown as {
        id: string;
        status: string;
        current_period_end: number;
        cancel_at_period_end: boolean;
        items: { data: Array<{ price: { id: string }; quantity: number }> };
      };

      return {
        id: subscription.id,
        status: subscription.status,
        currentPeriodEnd: new Date((subscription.current_period_end || 0) * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
        items: subscription.items.data.map(item => ({
          priceId: item.price.id,
          quantity: item.quantity || 1,
        })),
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Stripe get subscription error:', error);
      throw new Error(`Failed to get subscription: ${errorMessage}`);
    }
  }

  /**
   * Cancel a subscription
   * @param subscriptionId - Subscription ID
   * @param immediate - Cancel immediately or at period end
   */
  async cancelSubscription(subscriptionId: string, immediate = false): Promise<void> {
    try {
      if (immediate) {
        await this.stripe.subscriptions.cancel(subscriptionId);
      } else {
        await this.stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true,
        });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Stripe cancel subscription error:', error);
      throw new Error(`Failed to cancel subscription: ${errorMessage}`);
    }
  }

  /**
   * Update subscription
   * @param subscriptionId - Subscription ID
   * @param priceId - New price ID
   */
  async updateSubscription(subscriptionId: string, priceId: string): Promise<void> {
    try {
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
      
      await this.stripe.subscriptions.update(subscriptionId, {
        items: [
          {
            id: subscription.items.data[0].id,
            price: priceId,
          },
        ],
        proration_behavior: 'create_prorations',
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Stripe update subscription error:', error);
      throw new Error(`Failed to update subscription: ${errorMessage}`);
    }
  }

  /**
   * Create a checkout session for subscription
   * @param customerId - Customer ID
   * @param priceId - Price ID
   * @param successUrl - Success redirect URL
   * @param cancelUrl - Cancel redirect URL
   * @returns Checkout session URL
   */
  async createCheckoutSession(
    customerId: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<string> {
    try {
      const session = await this.stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
      });

      return session.url || '';
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Stripe create checkout session error:', error);
      throw new Error(`Failed to create checkout session: ${errorMessage}`);
    }
  }

  /**
   * Create a billing portal session
   * @param customerId - Customer ID
   * @param returnUrl - Return URL after portal session
   * @returns Portal session URL
   */
  async createBillingPortal(customerId: string, returnUrl: string): Promise<string> {
    try {
      const session = await this.stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });

      return session.url;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Stripe create billing portal error:', error);
      throw new Error(`Failed to create billing portal: ${errorMessage}`);
    }
  }

  /**
   * List invoices for customer
   * @param customerId - Customer ID
   * @param limit - Number of invoices to retrieve
   * @returns Array of invoices
   */
  async listInvoices(customerId: string, limit = 10): Promise<Array<{
    id: string;
    status: string;
    amount: number;
    currency: string;
    created: Date;
    pdfUrl: string | null;
  }>> {
    try {
      const invoices = await this.stripe.invoices.list({
        customer: customerId,
        limit,
      });

      return invoices.data.map(invoice => ({
        id: invoice.id,
        status: invoice.status || 'unknown',
        amount: invoice.amount_due,
        currency: invoice.currency,
        created: new Date(invoice.created * 1000),
        pdfUrl: invoice.invoice_pdf || null,
      }));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Stripe list invoices error:', error);
      throw new Error(`Failed to list invoices: ${errorMessage}`);
    }
  }

  /**
   * Handle webhook events
   * @param payload - Raw request body
   * @param signature - Stripe signature header
   * @returns Stripe event object
   */
  async handleWebhook(payload: string | Buffer, signature: string): Promise<Stripe.Event> {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
    }

    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret
      );

      return event;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Stripe webhook error:', error);
      throw new Error(`Webhook signature verification failed: ${errorMessage}`);
    }
  }

  /**
   * Get usage-based billing meters (for AI/call usage tracking)
   * Phase 4 implementation
   */
  async recordUsage(
    subscriptionItemId: string,
    quantity: number,
    _action = 'increment'
  ): Promise<void> {
    try {
      // Usage records API - implementation depends on Stripe version
      // This will be implemented in Phase 4 with proper Stripe SDK version
      console.log(`Recording usage: ${subscriptionItemId}, quantity: ${quantity}`);
      throw new Error('Usage recording not yet implemented - Phase 4');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Stripe record usage error:', error);
      throw new Error(`Failed to record usage: ${errorMessage}`);
    }
  }
}

// Singleton instance
let stripeService: StripeService | null = null;

export const getStripeService = (): StripeService => {
  if (!stripeService) {
    stripeService = new StripeService();
  }
  return stripeService;
};
