import type { SubscriptionTier } from "@/lib/types";

export type RevenueCatEntitlement = {
  tier: SubscriptionTier;
  status: "inactive" | "trialing" | "active";
  mockMode: boolean;
};

function isTruthyFlag(value: string): boolean {
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function isProductionEnvironment(value = process.env.EXPO_PUBLIC_APP_ENV ?? ""): boolean {
  return ["prod", "production"].includes(value.trim().toLowerCase());
}

export function shouldUseMockSubscriptions(
  rawMockValue = process.env.EXPO_PUBLIC_MOCK_SUBSCRIPTIONS,
  rawAppEnvironment = process.env.EXPO_PUBLIC_APP_ENV
): boolean {
  const normalizedMockValue = rawMockValue?.trim();
  if (normalizedMockValue) {
    return isTruthyFlag(normalizedMockValue);
  }

  return !isProductionEnvironment(rawAppEnvironment ?? "");
}

export function entitlementForSubscriptionMode(mockMode: boolean): RevenueCatEntitlement {
  return mockMode
    ? {
        tier: "elite",
        status: "trialing",
        mockMode: true
      }
    : {
        tier: "free",
        status: "inactive",
        mockMode: false
      };
}

export async function getRevenueCatEntitlement(): Promise<RevenueCatEntitlement> {
  return entitlementForSubscriptionMode(shouldUseMockSubscriptions());
}
