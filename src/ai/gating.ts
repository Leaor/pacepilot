import type { PrivacyPreferences, SubscriptionTier } from "@/lib/types";
import { canUseAiCoach } from "@/subscriptions/gates";

export type AiGateResult = {
  allowed: boolean;
  reason?: string;
};

export function evaluateAiCoachGate(tier: SubscriptionTier, preferences: PrivacyPreferences): AiGateResult {
  if (!preferences.aiCoachEnabled) {
    return {
      allowed: false,
      reason: "AI Coach is disabled until the user opts in."
    };
  }

  if (!canUseAiCoach(tier, preferences.aiCoachEnabled)) {
    return {
      allowed: false,
      reason: "AI Coach requires Elite."
    };
  }

  return {
    allowed: true
  };
}
