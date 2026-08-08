import "server-only";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/server";

export type StripeReconciliation = {
  mode: "test";
  generatedAt: string;
  activeSubscriptions: number;
  activeMonthlyRecurringRevenue: number;
  uniqueCustomers: number;
  pastDueSubscriptions: number;
  linkedSubscriptions: number;
  unmatchedSubscriptions: string[];
};

function monthlyAmount(item: Stripe.SubscriptionItem) {
  const price = item.price;
  const amount = price.unit_amount ?? 0;
  const quantity = item.quantity ?? 1;
  const interval = price.recurring?.interval;
  const intervalCount = price.recurring?.interval_count ?? 1;
  if (interval === "year") return (amount * quantity) / (12 * intervalCount);
  if (interval === "month") return (amount * quantity) / intervalCount;
  if (interval === "week") return (amount * quantity * 52) / (12 * intervalCount);
  if (interval === "day") return (amount * quantity * 365) / (12 * intervalCount);
  return 0;
}

export async function reconcileStripe(linkedIds: Set<string>): Promise<StripeReconciliation> {
  const stripe = getStripe();
  const subscriptions: Stripe.Subscription[] = [];

  for await (const subscription of stripe.subscriptions.list({ status: "all", limit: 100 })) {
    subscriptions.push(subscription);
  }

  const active = subscriptions.filter((subscription) =>
    ["active", "trialing"].includes(subscription.status),
  );
  const customers = new Set(active.map((subscription) =>
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id,
  ));
  const unmatched = active.filter((subscription) => !linkedIds.has(subscription.id));

  return {
    mode: "test",
    generatedAt: new Date().toISOString(),
    activeSubscriptions: active.length,
    activeMonthlyRecurringRevenue: active.reduce(
      (total, subscription) => total + subscription.items.data.reduce((sum, item) => sum + monthlyAmount(item), 0),
      0,
    ) / 100,
    uniqueCustomers: customers.size,
    pastDueSubscriptions: subscriptions.filter((subscription) => subscription.status === "past_due").length,
    linkedSubscriptions: active.length - unmatched.length,
    unmatchedSubscriptions: unmatched.map((subscription) => subscription.id),
  };
}
