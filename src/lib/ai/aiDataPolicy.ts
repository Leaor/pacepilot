import type { Activity, PrivacyPreferences } from "@/lib/types";
import type { AiDataAccessLog, AiDataSource, AiFeature } from "@/lib/ai/aiTypes";

export type DataSourceConsent = {
  source: AiDataSource | "strava_cache";
  aiAllowed: boolean;
  revokedAt?: string | null;
};

export function getAllowedAiDataSources(_userId: string, preferences: PrivacyPreferences, consents: DataSourceConsent[] = []): AiDataSource[] {
  if (!preferences.aiCoachEnabled) {
    return [];
  }

  const allowed = new Set<AiDataSource>();
  if (preferences.allowProfileForAi) allowed.add("profile");
  if (preferences.allowCheckInsForAi) allowed.add("checkins");
  if (preferences.allowActivityDataForAi) {
    allowed.add("pacepilot_manual");
    allowed.add("pacepilot_gps");
    allowed.add("user_provided_import");
  }

  for (const consent of consents) {
    if (consent.source !== "strava_cache" && consent.aiAllowed && !consent.revokedAt) {
      allowed.add(consent.source);
    }
  }

  return Array.from(allowed);
}

export function filterActivitiesForAi(activities: Activity[]): Activity[] {
  return activities.filter((activity) => activity.source !== "strava_cache");
}

export function assertNoStravaData(payload: unknown): void {
  function containsBlockedValue(value: unknown, key?: string): boolean {
    if (key === "excludedSources") {
      return false;
    }

    if (typeof value === "string") {
      return value === "strava_cache" || value.includes("strava_access_token") || value.includes("strava_refresh_token");
    }

    if (Array.isArray(value)) {
      return value.some((item) => containsBlockedValue(item));
    }

    if (value && typeof value === "object") {
      return Object.entries(value).some(([entryKey, entryValue]) => containsBlockedValue(entryValue, entryKey));
    }

    return false;
  }

  if (containsBlockedValue(payload)) {
    throw new Error("Blocked Strava API/cache data from AI payload");
  }
}

export function buildAiContextFromAllowedSources(userId: string, data: { activities?: Activity[] }, preferences: PrivacyPreferences) {
  const sourcesUsed = getAllowedAiDataSources(userId, preferences);
  const context = {
    userId,
    activities: sourcesUsed.some((source) => source === "pacepilot_gps" || source === "pacepilot_manual")
      ? filterActivitiesForAi(data.activities ?? [])
      : [],
    sourcesUsed,
    excludedSources: ["strava_cache", "strava_api"]
  };
  assertNoStravaData(context);
  return context;
}

export function logAiDataAccess(userId: string, feature: AiFeature, sourcesUsed: AiDataSource[], excludedSources: string[]): AiDataAccessLog {
  return {
    userId,
    feature,
    sourcesUsed,
    excludedSources,
    createdAt: new Date().toISOString()
  };
}
