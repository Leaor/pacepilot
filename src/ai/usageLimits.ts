import type { SubscriptionTier } from "@/lib/types";

export type AiUsageFeature = "coach_chat" | "weekly_analysis" | "workout_analysis" | "race_strategy";

export type UsageSnapshot = {
  tier: SubscriptionTier;
  feature: AiUsageFeature;
  usedThisMonth: number;
};

const monthlyLimits: Record<SubscriptionTier, Record<AiUsageFeature, number>> = {
  free: {
    coach_chat: 0,
    weekly_analysis: 0,
    workout_analysis: 0,
    race_strategy: 0
  },
  pro: {
    coach_chat: 75,
    weekly_analysis: 8,
    workout_analysis: 40,
    race_strategy: 0
  },
  elite: {
    coach_chat: 250,
    weekly_analysis: 12,
    workout_analysis: 120,
    race_strategy: 12
  }
};

export function getMonthlyAiLimit(tier: SubscriptionTier, feature: AiUsageFeature): number {
  return monthlyLimits[tier][feature];
}

export function canSpendAiRequest(snapshot: UsageSnapshot): boolean {
  return snapshot.usedThisMonth < getMonthlyAiLimit(snapshot.tier, snapshot.feature);
}

export function usageFallbackMessage(snapshot: UsageSnapshot): string {
  const limit = getMonthlyAiLimit(snapshot.tier, snapshot.feature);
  if (limit === 0) {
    return "This AI feature is not included in the current subscription tier.";
  }

  return "Monthly AI usage for this feature has been reached. PacePilot will show deterministic training guidance until the next cycle.";
}
