import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import Stripe from "stripe";

const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");

// Prices are defined server-side so a client can never alter the amount charged.
const PRICES = {
  report: 500,      // $5.00 in cents
  consultant: 1000,  // $10.00 in cents
};

export const createPaymentIntent = onCall(
  { secrets: [stripeSecretKey] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "You must be signed in to check out.");
    }

    const { includeReport, includeConsultant } = request.data as {
      includeReport?: boolean;
      includeConsultant?: boolean;
    };

    let amount = 0;
    if (includeReport) amount += PRICES.report;
    if (includeConsultant) amount += PRICES.consultant;

    if (amount <= 0) {
      throw new HttpsError("invalid-argument", "Nothing selected to purchase.");
    }

    // Retrieve the secret value directly at execution time
    const secretValue = stripeSecretKey.value();
    if (!secretValue) {
      throw new HttpsError("internal", "Stripe secret key is not configured.");
    }

    const stripe = new Stripe(secretValue, {
      apiVersion: "2026-07-29.dahlia" as any,
    });

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "sgd",
      automatic_payment_methods: { enabled: true },
      metadata: {
        uid: request.auth.uid,
        includeReport: String(!!includeReport),
        includeConsultant: String(!!includeConsultant),
      },
    });

    return { clientSecret: paymentIntent.client_secret };
  }
); 
