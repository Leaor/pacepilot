import { supabase } from "@/lib/supabase";
import type { AiFeature } from "@/lib/ai/aiTypes";

const functionByFeature: Record<AiFeature, string> = {
  coach_chat: "ai-chat",
  weekly_summary: "ai-weekly-summary",
  run_analysis: "ai-run-analysis",
  plan_adjustment_explainer: "ai-plan-adjustment-explainer",
  race_strategy_explainer: "ai-race-strategy-explainer"
};

export async function invokeAiFeature(feature: AiFeature, payload: Record<string, unknown>) {
  return supabase.functions.invoke(functionByFeature[feature], { body: payload });
}
