import { getUncachableStripeClient } from './stripeClient';
import { db } from './db';
import { sql } from 'drizzle-orm';

export type PlanTier = "free" | "basic" | "essential" | "complete";

export interface PlanFeatures {
  tier: PlanTier;
  maxActiveContacts: number;
  checkInAlertChannels: ("email" | "sms" | "voice")[];
  sosAlertChannels: ("email" | "sms" | "voice")[];
  shakeToAlert: boolean;
  continuousTracking: boolean;
  emergencyRecording: boolean;
  moodTracking: boolean;
  petProtection: boolean;
  digitalDocuments: boolean;
  activities: boolean;
  wellbeingAi: boolean;
  pushNotifications: boolean;
  offlineSmsBackup: boolean;
}

const PLAN_FEATURES: Record<PlanTier, PlanFeatures> = {
  free: {
    tier: "free",
    maxActiveContacts: 2,
    checkInAlertChannels: ["email"],
    sosAlertChannels: ["email", "sms", "voice"],
    shakeToAlert: false,
    continuousTracking: false,
    emergencyRecording: false,
    moodTracking: false,
    petProtection: false,
    digitalDocuments: false,
    activities: false,
    wellbeingAi: false,
    pushNotifications: false,
    offlineSmsBackup: false,
  },
  basic: {
    tier: "basic",
    maxActiveContacts: 2,
    checkInAlertChannels: ["email"],
    sosAlertChannels: ["email", "sms", "voice"],
    shakeToAlert: false,
    continuousTracking: false,
    emergencyRecording: false,
    moodTracking: false,
    petProtection: false,
    digitalDocuments: false,
    activities: false,
    wellbeingAi: false,
    pushNotifications: false,
    offlineSmsBackup: false,
  },
  essential: {
    tier: "essential",
    maxActiveContacts: 5,
    checkInAlertChannels: ["email", "sms", "voice"],
    sosAlertChannels: ["email", "sms", "voice"],
    shakeToAlert: true,
    continuousTracking: true,
    emergencyRecording: false,
    moodTracking: false,
    petProtection: false,
    digitalDocuments: false,
    activities: false,
    wellbeingAi: false,
    pushNotifications: true,
    offlineSmsBackup: true,
  },
  complete: {
    tier: "complete",
    maxActiveContacts: 5,
    checkInAlertChannels: ["email", "sms", "voice"],
    sosAlertChannels: ["email", "sms", "voice"],
    shakeToAlert: true,
    continuousTracking: true,
    emergencyRecording: true,
    moodTracking: true,
    petProtection: true,
    digitalDocuments: true,
    activities: true,
    wellbeingAi: true,
    pushNotifications: true,
    offlineSmsBackup: true,
  },
};

export function getPlanFeatures(tier: PlanTier): PlanFeatures {
  return PLAN_FEATURES[tier];
}

export function tierFromAmount(unitAmount: number | null): PlanTier {
  if (!unitAmount) return "free";
  if (unitAmount <= 299) return "basic";
  if (unitAmount <= 999) return "essential";
  return "complete";
}

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
    trialDays: number = 0
  ) {
    const stripe = await getUncachableStripeClient();
    
    const sessionParams: any = {
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      payment_method_collection: 'always',
    };

    if (trialDays > 0) {
      sessionParams.subscription_data = {
        trial_period_days: trialDays,
      };
    }

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

  async getCustomerByEmail(email: string) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.customers WHERE email = ${email} ORDER BY created DESC LIMIT 1`
    );
    return result.rows[0] || null;
  }

  async getSubscriptionByCustomerEmail(email: string) {
    const result = await db.execute(
      sql`
        SELECT s.*, c.email as customer_email, p.name as product_name, pr.unit_amount, pr.currency, pr.recurring
        FROM stripe.subscriptions s
        JOIN stripe.customers c ON s.customer = c.id
        LEFT JOIN stripe.prices pr ON pr.id = (s.items::jsonb->'data'->0->'price'->>'id')
        LEFT JOIN stripe.products p ON p.id = pr.product
        WHERE c.email = ${email} 
        AND s.status IN ('active', 'trialing', 'past_due')
        ORDER BY s.created DESC
        LIMIT 1
      `
    );
    return result.rows[0] || null;
  }

  async getUserPlanTier(email: string): Promise<PlanTier> {
    const subscription = await this.getSubscriptionByCustomerEmail(email) as any;
    if (!subscription) return "free";
    return tierFromAmount(subscription.unit_amount);
  }

  async getUserPlanFeatures(email: string): Promise<PlanFeatures> {
    const tier = await this.getUserPlanTier(email);
    return getPlanFeatures(tier);
  }

  async cancelSubscription(subscriptionId: string, cancelAtPeriodEnd: boolean = true) {
    const stripe = await getUncachableStripeClient();
    if (cancelAtPeriodEnd) {
      return await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
    } else {
      return await stripe.subscriptions.cancel(subscriptionId);
    }
  }

  async reactivateSubscription(subscriptionId: string) {
    const stripe = await getUncachableStripeClient();
    return await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });
  }
}

export const stripeService = new StripeService();
