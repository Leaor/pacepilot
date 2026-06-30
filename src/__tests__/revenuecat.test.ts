import { describe, expect, it } from "vitest";
import { entitlementForSubscriptionMode, shouldUseMockSubscriptions } from "@/lib/revenuecat";

describe("RevenueCat entitlement defaults", () => {
  it("uses mock subscriptions for local previews by default", () => {
    expect(shouldUseMockSubscriptions(undefined, "development")).toBe(true);
    expect(entitlementForSubscriptionMode(true)).toEqual({
      tier: "elite",
      status: "trialing",
      mockMode: true
    });
  });

  it("fails closed when mock subscriptions are disabled", () => {
    expect(shouldUseMockSubscriptions("false", "development")).toBe(false);
    expect(entitlementForSubscriptionMode(false)).toEqual({
      tier: "free",
      status: "inactive",
      mockMode: false
    });
  });

  it("fails closed by default in production", () => {
    expect(shouldUseMockSubscriptions(undefined, "production")).toBe(false);
  });
});
