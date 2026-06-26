import type { SubscriptionTier } from "@/lib/types";

export function entitlementIncludes(tier: SubscriptionTier, required: SubscriptionTier): boolean {
  const order: SubscriptionTier[] = ["free", "pro", "elite"];
  return order.indexOf(tier) >= order.indexOf(required);
}
