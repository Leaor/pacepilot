import type { SubscriptionTier } from "@/lib/types";

export type RevenueCatEntitlement = {
  tier: SubscriptionTier;
  status: "inactive" | "trialing" | "active";
  mockMode: boolean;
};

export async function getRevenueCatEntitlement(): Promise<RevenueCatEntitlement> {
  return {
    tier: "elite",
    status: "trialing",
    mockMode: process.env.MOCK_SUBSCRIPTIONS !== "false"
  };
}
