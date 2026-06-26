import type { Activity, CheckIn, CoachMemoryItem, PrivacyPreferences } from "@/lib/types";

export type AiDataCategory = "pacepilot_activity" | "check_ins" | "profile_onboarding" | "race_results" | "plan_history";

export type AiContextInput = {
  activities: Activity[];
  checkIns: CheckIn[];
  profile?: Record<string, unknown>;
  raceResults?: Record<string, unknown>[];
  planHistory?: Record<string, unknown>[];
  coachMemory?: CoachMemoryItem[];
};

export type AiFilteredContext = {
  activities: Activity[];
  checkIns: CheckIn[];
  profile?: Record<string, unknown>;
  raceResults: Record<string, unknown>[];
  planHistory: Record<string, unknown>[];
  coachMemory: CoachMemoryItem[];
  dataCategoriesUsed: AiDataCategory[];
  excludedSources: string[];
};

export function filterAiContext(input: AiContextInput, preferences: PrivacyPreferences): AiFilteredContext {
  const dataCategoriesUsed: AiDataCategory[] = [];
  const excludedSources = ["strava_cache", "strava_api", "protected_race_data", "scraped_race_data"];

  const activities = preferences.aiCoachEnabled && preferences.allowActivityDataForAi
    ? input.activities.filter((activity) => activity.source === "pacepilot_gps" || activity.source === "pacepilot_manual")
    : [];

  if (activities.length > 0) {
    dataCategoriesUsed.push("pacepilot_activity");
  }

  const checkIns = preferences.aiCoachEnabled && preferences.allowCheckInsForAi ? input.checkIns : [];
  if (checkIns.length > 0) {
    dataCategoriesUsed.push("check_ins");
  }

  const profile = preferences.aiCoachEnabled && preferences.allowProfileForAi ? input.profile : undefined;
  if (profile) {
    dataCategoriesUsed.push("profile_onboarding");
  }

  const raceResults = preferences.aiCoachEnabled ? (input.raceResults ?? []) : [];
  if (raceResults.length > 0) {
    dataCategoriesUsed.push("race_results");
  }

  const planHistory = preferences.aiCoachEnabled ? (input.planHistory ?? []) : [];
  if (planHistory.length > 0) {
    dataCategoriesUsed.push("plan_history");
  }

  return {
    activities,
    checkIns,
    profile,
    raceResults,
    planHistory,
    coachMemory: preferences.aiCoachEnabled ? (input.coachMemory ?? []) : [],
    dataCategoriesUsed,
    excludedSources
  };
}

export function assertNoStravaData(context: AiFilteredContext): void {
  const hasStrava = context.activities.some((activity) => activity.source === "strava_cache");

  if (hasStrava) {
    throw new Error("AI context must not include Strava API or cache data");
  }
}

export function summarizeAiDataUse(context: AiFilteredContext): string {
  if (context.dataCategoriesUsed.length === 0) {
    return "No PacePilot data categories were authorized for AI coaching.";
  }

  return `AI coaching used: ${context.dataCategoriesUsed.join(", ")}. Excluded: ${context.excludedSources.join(", ")}.`;
}
