import { assertNoStravaData } from "@/lib/ai/aiDataPolicy";
import type { AiFeature } from "@/lib/ai/aiTypes";
import { trainingSafetyBoundary } from "@/lib/ai/safetyGuards";

export function buildCoachPrompt(feature: AiFeature, question: string, context: unknown) {
  assertNoStravaData(context);

  return {
    feature,
    instructions: trainingSafetyBoundary(),
    question,
    context
  };
}
