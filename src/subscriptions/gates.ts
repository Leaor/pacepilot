import type { SubscriptionTier } from "@/lib/types";

export type PremiumFeature =
  | "ai_weekly_analysis"
  | "adaptive_plans"
  | "advanced_pace_zones"
  | "calendar_export"
  | "ai_race_strategy"
  | "custom_taper"
  | "travel_checklist"
  | "deep_progress_reports"
  | "premium_support";

const proFeatures: PremiumFeature[] = [
  "ai_weekly_analysis",
  "adaptive_plans",
  "advanced_pace_zones",
  "calendar_export"
];

const eliteFeatures: PremiumFeature[] = [
  ...proFeatures,
  "ai_race_strategy",
  "custom_taper",
  "travel_checklist",
  "deep_progress_reports",
  "premium_support"
];

export function hasFeature(tier: SubscriptionTier, feature: PremiumFeature): boolean {
  if (tier === "elite") {
    return eliteFeatures.includes(feature);
  }

  if (tier === "pro") {
    return proFeatures.includes(feature);
  }

  return false;
}

export function canUseAiCoach(tier: SubscriptionTier, aiCoachEnabled: boolean): boolean {
  return aiCoachEnabled && tier === "elite";
}
