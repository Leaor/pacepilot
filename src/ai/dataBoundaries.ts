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

function canUseCoachMemoryItem(item: CoachMemoryItem, preferences: PrivacyPreferences): boolean {
  switch (item.source) {
    case "onboarding":
    case "race_result":
    case "user_edit":
      return preferences.allowProfileForAi;
    case "check_in":
      return preferences.allowCheckInsForAi;
    case "plan_adjustment":
      return preferences.allowActivityDataForAi || preferences.allowProfileForAi;
  }
}

export function filterAiContext(input: AiContextInput, preferences: PrivacyPreferences): AiFilteredContext {
  const dataCategoriesUsed: AiDataCategory[] = [];
  const excludedSources = ["strava_cache", "strava_api", "protected_race_data", "scraped_race_data"];
  const aiEnabled = preferences.aiCoachEnabled;

  const activities = aiEnabled && preferences.allowActivityDataForAi
    ? input.activities.filter((activity) => activity.source === "pacepilot_gps" || activity.source === "pacepilot_manual")
    : [];

  if (activities.length > 0) {
    dataCategoriesUsed.push("pacepilot_activity");
  }

  const checkIns = aiEnabled && preferences.allowCheckInsForAi ? input.checkIns : [];
  if (checkIns.length > 0) {
    dataCategoriesUsed.push("check_ins");
  }

  const profile = aiEnabled && preferences.allowProfileForAi ? input.profile : undefined;
  if (profile) {
    dataCategoriesUsed.push("profile_onboarding");
  }

  const raceResults = aiEnabled && preferences.allowProfileForAi ? (input.raceResults ?? []) : [];
  if (raceResults.length > 0) {
    dataCategoriesUsed.push("race_results");
  }

  const planHistory = aiEnabled && (preferences.allowActivityDataForAi || preferences.allowProfileForAi) ? (input.planHistory ?? []) : [];
  if (planHistory.length > 0) {
    dataCategoriesUsed.push("plan_history");
  }

  const coachMemory = aiEnabled
    ? (input.coachMemory ?? []).filter((item) => canUseCoachMemoryItem(item, preferences))
    : [];

  return {
    activities,
    checkIns,
    profile,
    raceResults,
    planHistory,
    coachMemory,
    dataCategoriesUsed,
    excludedSources
  };
}

export function assertNoStravaData(context: AiFilteredContext): void {
  function containsBlockedValue(value: unknown, key?: string): boolean {
    if (key === "excludedSources") {
      return false;
    }

    if (key && /token|secret|password|authorization/i.test(key)) {
      return true;
    }

    if (typeof value === "string") {
      const normalized = value.toLowerCase();
      return normalized === "strava_cache" ||
        normalized.includes("strava_access_token") ||
        normalized.includes("strava_refresh_token") ||
        normalized.includes("protected_race_data") ||
        normalized.includes("scraped_race_data");
    }

    if (Array.isArray(value)) {
      return value.some((item) => containsBlockedValue(item));
    }

    if (value && typeof value === "object") {
      return Object.entries(value).some(([entryKey, entryValue]) => containsBlockedValue(entryValue, entryKey));
    }

    return false;
  }

  if (containsBlockedValue(context)) {
    throw new Error("AI context must not include Strava API or cache data");
  }
}

export function summarizeAiDataUse(context: AiFilteredContext): string {
  if (context.dataCategoriesUsed.length === 0) {
    return "No PacePilot data categories were authorized for AI coaching.";
  }

  return `AI coaching used: ${context.dataCategoriesUsed.join(", ")}. Excluded: ${context.excludedSources.join(", ")}.`;
}
