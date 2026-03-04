import { getStripeSync, getUncachableStripeClient } from './stripeClient';
import { sendPaymentFailedEmails } from './notifications';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const sync = await getStripeSync();
    
    try {
      const stripe = await getUncachableStripeClient();
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || process.env.stripetestkeymarch;
      
      if (webhookSecret) {
        const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
        
        if (event.type === 'invoice.payment_failed') {
          const invoice = event.data.object as any;
          const customerEmail = invoice.customer_email;
          const customerName = invoice.customer_name || '';
          
          if (customerEmail) {
            console.log(`[WEBHOOK] Payment failed for customer: ${customerEmail}`);
            await sendPaymentFailedEmails(customerEmail, customerName);
          }
        }
      }
    } catch (error: any) {
      console.log('[WEBHOOK] Could not process custom event handling:', error.message);
    }

    await sync.processWebhook(payload, signature);
  }
}
