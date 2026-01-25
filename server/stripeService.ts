import { getUncachableStripeClient } from './stripeClient';
import { db } from './db';
import { sql } from 'drizzle-orm';

export class StripeService {
  async createCustomer(email: string, userId?: string) {
    const stripe = await getUncachableStripeClient();
    return await stripe.customers.create({
      email,
      metadata: userId ? { userId } : {},
    });
  }

  async createSubscriptionCheckoutSession(
    customerId: string | null,
    priceId: string,
    successUrl: string,
    cancelUrl: string,
    customerEmail?: string,
    trialDays: number = 7
  ) {
    const stripe = await getUncachableStripeClient();
    
    const sessionParams: any = {
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: {
        trial_period_days: trialDays,
      },
      payment_method_collection: 'if_required',
    };

    if (customerId) {
      sessionParams.customer = customerId;
    } else if (customerEmail) {
      sessionParams.customer_email = customerEmail;
    }

    return await stripe.checkout.sessions.create(sessionParams);
  }

  async createPaymentIntent(amount: number, currency: string = 'gbp') {
    const stripe = await getUncachableStripeClient();
    return await stripe.paymentIntents.create({
      amount,
      currency,
      automatic_payment_methods: {
        enabled: true,
      },
    });
  }

  async createSetupIntent(customerId?: string) {
    const stripe = await getUncachableStripeClient();
    const params: any = {
      automatic_payment_methods: {
        enabled: true,
      },
    };
    if (customerId) {
      params.customer = customerId;
    }
    return await stripe.setupIntents.create(params);
  }

  async getProduct(productId: string) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.products WHERE id = ${productId}`
    );
    return result.rows[0] || null;
  }

  async listProducts(active = true) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.products WHERE active = ${active}`
    );
    return result.rows;
  }

  async listPrices(active = true) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.prices WHERE active = ${active}`
    );
    return result.rows;
  }

  async getProductsWithPrices(active = true) {
    const result = await db.execute(
      sql`
        SELECT 
          p.id as product_id,
          p.name as product_name,
          p.description as product_description,
          p.active as product_active,
          p.metadata as product_metadata,
          pr.id as price_id,
          pr.unit_amount,
          pr.currency,
          pr.recurring,
          pr.active as price_active,
          pr.metadata as price_metadata
        FROM stripe.products p
        LEFT JOIN stripe.prices pr ON pr.product = p.id AND pr.active = true
        WHERE p.active = ${active}
        ORDER BY p.id, pr.unit_amount
      `
    );
    return result.rows;
  }

  async getSubscription(subscriptionId: string) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.subscriptions WHERE id = ${subscriptionId}`
    );
    return result.rows[0] || null;
  }
}

export const stripeService = new StripeService();
