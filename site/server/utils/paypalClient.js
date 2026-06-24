import checkoutSdk from '@paypal/checkout-server-sdk';

function paypalClient() {
  const env =
    process.env.PAYPAL_ENV === 'live'
      ? new checkoutSdk.core.LiveEnvironment(
          process.env.PAYPAL_CLIENT_ID,
          process.env.PAYPAL_CLIENT_SECRET
        )
      : new checkoutSdk.core.SandboxEnvironment(
          process.env.PAYPAL_CLIENT_ID,
          process.env.PAYPAL_CLIENT_SECRET
        );
  return new checkoutSdk.core.PayPalHttpClient(env);
}

export { checkoutSdk, paypalClient };
