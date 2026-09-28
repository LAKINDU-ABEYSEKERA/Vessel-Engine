import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('Missing STRIPE_SECRET_KEY in environment variables.');
}

/**
 * The Stripe Node SDK types `apiVersion` as a union of every API version
 * it was compiled against. When we pin to a version newer than the SDK's
 * release, we cast — but to the SDK's own type, not `any`, so downstream
 * callers still get correct typing.
 */
const apiVersion = '2025-02-24.acacia' as Stripe.StripeConfig['apiVersion'];

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion,
    typescript: true,
    appInfo: {
        name: 'Vessel Engine',
        version: '0.1.0',
    },
});