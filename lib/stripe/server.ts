import "server-only";
import Stripe from "stripe";

let stripeClient: Stripe | undefined;

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured.");
  if (!key.startsWith("rk_test_")) {
    throw new Error("This foundation only accepts a restricted Stripe test key.");
  }

  stripeClient ??= new Stripe(key, { appInfo: { name: "Invictus Hub" } });
  return stripeClient;
}
