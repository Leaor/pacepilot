import type { Activity } from "@/lib/types";
import { blockedStravaAnalysisMessage } from "@/lib/ai/safetyGuards";

export function canAnalyzeActivityWithAi(activity: Activity): { allowed: boolean; reason?: string } {
  if (activity.source === "strava_cache") {
    return {
      allowed: false,
      reason: blockedStravaAnalysisMessage()
    };
  }

  return { allowed: true };
}
