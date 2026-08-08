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
  linkedBillingStatuses: Array<{
    subscriptionId: string;
    billingStatus: "active" | "past_due" | "canceled";
    openBalance: number;
  }>;
  unmatchedSubscriptions: Array<{
    id: string;
    customer: string;
    monthlyRecurringRevenue: number;
  }>;
};

export function monthlyAmount(item: Stripe.SubscriptionItem) {
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
  const openBalanceByCustomer = new Map<string, number>();
  for await (const invoice of stripe.invoices.list({ status: "open", limit: 100 })) {
    const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
    if (customerId) openBalanceByCustomer.set(customerId, (openBalanceByCustomer.get(customerId) ?? 0) + invoice.amount_remaining / 100);
  }
  const linkedBillingStatuses = subscriptions.filter((subscription) => linkedIds.has(subscription.id)).map((subscription) => {
    const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
    const openBalance = openBalanceByCustomer.get(customerId) ?? 0;
    const billingStatus = subscription.status === "canceled"
      ? "canceled" as const
      : subscription.status === "past_due" || subscription.status === "unpaid" || openBalance > 0
        ? "past_due" as const
        : "active" as const;
    return { subscriptionId: subscription.id, billingStatus, openBalance };
  });
  const unmatchedSubscriptions = await Promise.all(unmatched.map(async (subscription) => {
    const customerId = typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;
    const customer = await stripe.customers.retrieve(customerId);
    const label = customer.deleted
      ? "Deleted customer"
      : customer.name || customer.email || "Unnamed Stripe customer";
    return {
      id: subscription.id,
      customer: label,
      monthlyRecurringRevenue: subscription.items.data.reduce(
        (sum, item) => sum + monthlyAmount(item), 0,
      ) / 100,
    };
  }));

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
    linkedBillingStatuses,
    unmatchedSubscriptions,
  };
}
