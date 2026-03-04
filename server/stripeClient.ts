import Stripe from 'stripe';

function getDirectCredentials() {
  const secretKey = process.env.STRIPE_SECRET_KEY || process.env.SLACK_TEST_API_KEY;
  const publishableKey = process.env.VITE_STRIPE_PUBLISHABLE_KEY;

  if (secretKey && publishableKey) {
    return { secretKey, publishableKey };
  }
  return null;
}

async function getConnectorCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? 'depl ' + process.env.WEB_REPL_RENEWAL
      : null;

  if (!xReplitToken || !hostname) {
    return null;
  }

  const connectorName = 'stripe';
  const isProduction = process.env.REPLIT_DEPLOYMENT === '1';
  const targetEnvironment = isProduction ? 'production' : 'development';

  const url = new URL(`https://${hostname}/api/v2/connection`);
  url.searchParams.set('include_secrets', 'true');
  url.searchParams.set('connector_names', connectorName);
  url.searchParams.set('environment', targetEnvironment);

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    });

    const data = await response.json();
    const connectionSettings = data.items?.[0];

    if (connectionSettings?.settings?.publishable && connectionSettings?.settings?.secret) {
      return {
        publishableKey: connectionSettings.settings.publishable,
        secretKey: connectionSettings.settings.secret,
      };
    }
  } catch (error) {
    console.log('[STRIPE] Connector not available, using direct credentials');
  }

  return null;
}

async function getCredentials() {
  const direct = getDirectCredentials();
  if (direct) return direct;

  const connector = await getConnectorCredentials();
  if (connector) return connector;

  throw new Error(
    'Stripe credentials not found. Set STRIPE_SECRET_KEY and VITE_STRIPE_PUBLISHABLE_KEY environment variables, ' +
    'or configure the Stripe integration in Replit.'
  );
}

export async function getUncachableStripeClient() {
  const { secretKey } = await getCredentials();
  return new Stripe(secretKey, {
    apiVersion: '2025-11-17.clover' as any,
  });
}

export async function getStripePublishableKey() {
  const { publishableKey } = await getCredentials();
  return publishableKey;
}

export async function getStripeSecretKey() {
  const { secretKey } = await getCredentials();
  return secretKey;
}

let stripeSync: any = null;

export async function getStripeSync() {
  if (!stripeSync) {
    const { StripeSync } = await import('stripe-replit-sync');
    const secretKey = await getStripeSecretKey();

    stripeSync = new StripeSync({
      poolConfig: {
        connectionString: process.env.DATABASE_URL!,
        max: 2,
      },
      stripeSecretKey: secretKey,
    });
  }
  return stripeSync;
}
