import type { ActivitySource } from "@/lib/types";

export type AiFeature =
  | "coach_chat"
  | "weekly_summary"
  | "run_analysis"
  | "plan_adjustment_explainer"
  | "race_strategy_explainer";

export type AiDataSource = Exclude<ActivitySource, "strava_cache"> | "profile" | "checkins" | "race_goals" | "chat_text" | "shoes";

export type AiDataAccessLog = {
  userId: string;
  feature: AiFeature;
  sourcesUsed: AiDataSource[];
  excludedSources: string[];
  createdAt: string;
};
