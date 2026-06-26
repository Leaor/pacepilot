import type { AiFilteredContext } from "@/ai/dataBoundaries";
import { assertNoStravaData } from "@/ai/dataBoundaries";

export type AiFeatureName = "coach_chat" | "weekly_analysis" | "workout_analysis" | "race_strategy";

export type AiPromptPayload = {
  feature: AiFeatureName;
  safetyBoundary: string;
  userQuestion?: string;
  context: AiFilteredContext;
};

export function buildAiPromptPayload(feature: AiFeatureName, context: AiFilteredContext, userQuestion?: string): AiPromptPayload {
  assertNoStravaData(context);

  return {
    feature,
    userQuestion,
    safetyBoundary:
      "Training guidance is educational and not medical advice. Do not diagnose, treat injury, or override PacePilot deterministic safety rules.",
    context
  };
}
