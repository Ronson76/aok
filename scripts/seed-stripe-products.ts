import { getUncachableStripeClient } from '../server/stripeClient';

async function seedProducts() {
  const stripe = await getUncachableStripeClient();
  
  console.log('Creating aok subscription products...');

  const existingProducts = await stripe.products.search({ query: "name:'aok'" });
  if (existingProducts.data.length > 0) {
    console.log('Products already exist, skipping seed');
    return;
  }

  const baseProduct = await stripe.products.create({
    name: 'aok Base',
    description: 'Daily check-ins with email and SMS alerts to your emergency contacts',
    metadata: {
      tier: 'base',
      features: 'daily_checkin,email_alerts,sms_alerts,emergency_contacts',
    }
  });
  console.log('Created Base product:', baseProduct.id);

  const baseMonthlyPrice = await stripe.prices.create({
    product: baseProduct.id,
    unit_amount: 499,
    currency: 'gbp',
    recurring: { interval: 'month' },
    metadata: { billing: 'monthly' }
  });
  console.log('Created Base monthly price:', baseMonthlyPrice.id);

  const baseYearlyPrice = await stripe.prices.create({
    product: baseProduct.id,
    unit_amount: 4999,
    currency: 'gbp',
    recurring: { interval: 'year' },
    metadata: { billing: 'yearly' }
  });
  console.log('Created Base yearly price:', baseYearlyPrice.id);

  const plusProduct = await stripe.products.create({
    name: 'aok Plus',
    description: 'Everything in Base plus AI phone check-ins and voice call alerts',
    metadata: {
      tier: 'plus',
      features: 'daily_checkin,email_alerts,sms_alerts,emergency_contacts,ai_phone_checkins,voice_calls',
    }
  });
  console.log('Created Plus product:', plusProduct.id);

  const plusMonthlyPrice = await stripe.prices.create({
    product: plusProduct.id,
    unit_amount: 899,
    currency: 'gbp',
    recurring: { interval: 'month' },
    metadata: { billing: 'monthly' }
  });
  console.log('Created Plus monthly price:', plusMonthlyPrice.id);

  const plusYearlyPrice = await stripe.prices.create({
    product: plusProduct.id,
    unit_amount: 8999,
    currency: 'gbp',
    recurring: { interval: 'year' },
    metadata: { billing: 'yearly' }
  });
  console.log('Created Plus yearly price:', plusYearlyPrice.id);

  console.log('\nAll products created successfully!');
  console.log('\nPrice IDs for your application:');
  console.log('Base Monthly:', baseMonthlyPrice.id);
  console.log('Base Yearly:', baseYearlyPrice.id);
  console.log('Plus Monthly:', plusMonthlyPrice.id);
  console.log('Plus Yearly:', plusYearlyPrice.id);
}

seedProducts()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error seeding products:', error);
    process.exit(1);
  });
