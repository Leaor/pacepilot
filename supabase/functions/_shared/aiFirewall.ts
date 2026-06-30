const blockedSources = new Set([
  "strava_cache",
  "strava_api",
  "strava_segments",
  "strava_leaderboards",
  "deleted_user_data",
  "opted_out"
]);

export type AiPrivacySnapshot = {
  ai_can_use_pacepilot_activity_history?: boolean | null;
  ai_can_use_checkins?: boolean | null;
  ai_can_use_race_goals?: boolean | null;
  ai_can_use_chat_history?: boolean | null;
  ai_can_use_user_provided_imports?: boolean | null;
  ai_can_use_garmin_data?: boolean | null;
  ai_can_use_apple_health_data?: boolean | null;
};

export type AiFirewallResult = {
  usedSources: string[];
  excludedSources: string[];
};

function normalizeSource(source: string): string {
  return source.trim().toLowerCase();
}

function isBlockedSource(source: string): boolean {
  const normalized = normalizeSource(source);
  return !normalized || blockedSources.has(normalized) || normalized.includes("strava");
}

function isAllowedByPrivacy(source: string, privacy?: AiPrivacySnapshot | null): boolean {
  if (isBlockedSource(source)) {
    return false;
  }

  if (!privacy) {
    return true;
  }

  switch (normalizeSource(source)) {
    case "pacepilot_activity":
    case "pacepilot_gps":
    case "pacepilot_manual":
    case "activity_history":
    case "activities":
      return privacy.ai_can_use_pacepilot_activity_history === true;
    case "check_ins":
    case "checkins":
    case "check_in":
      return privacy.ai_can_use_checkins === true;
    case "race_goals":
    case "race_results":
    case "profile":
    case "profile_onboarding":
    case "profile_summary":
      return privacy.ai_can_use_race_goals === true;
    case "chat_text":
    case "chat_history":
      return privacy.ai_can_use_chat_history === true;
    case "user_provided_import":
    case "user_provided_imports":
    case "user_import":
      return privacy.ai_can_use_user_provided_imports === true;
    case "garmin_import":
    case "garmin_data":
      return privacy.ai_can_use_garmin_data === true;
    case "apple_health_import":
    case "apple_health_data":
      return privacy.ai_can_use_apple_health_data === true;
    case "plan_history":
      return privacy.ai_can_use_pacepilot_activity_history === true || privacy.ai_can_use_race_goals === true;
    default:
      return false;
  }
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

export function applyAiDataFirewall(requestedSources: string[], privacy?: AiPrivacySnapshot | null): AiFirewallResult {
  const usedSources: string[] = [];
  const excludedSources: string[] = [];

  for (const source of requestedSources) {
    if (!isAllowedByPrivacy(source, privacy)) {
      excludedSources.push(source || "unknown");
    } else {
      usedSources.push(source);
    }
  }

  if (!excludedSources.includes("strava_cache")) {
    excludedSources.push("strava_cache");
  }

  return {
    usedSources: unique(usedSources),
    excludedSources: unique(excludedSources)
  };
}

function removeSensitiveKey(key: string): boolean {
  return /token|secret|password|authorization/i.test(key);
}

function sanitizeValue(value: unknown, privacy?: AiPrivacySnapshot | null): unknown {
  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeValue(item, privacy))
      .filter((item) => item !== undefined);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const record = value as Record<string, unknown>;
  if (typeof record.source === "string" && !isAllowedByPrivacy(record.source, privacy)) {
    return undefined;
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, nestedValue] of Object.entries(record)) {
    if (removeSensitiveKey(key)) {
      continue;
    }

    const nextValue = sanitizeValue(nestedValue, privacy);
    if (nextValue !== undefined) {
      sanitized[key] = nextValue;
    }
  }

  return sanitized;
}

export function sanitizeAiRequestInput(
  input: Record<string, unknown>,
  privacy: AiPrivacySnapshot | null,
  firewall: AiFirewallResult
): Record<string, unknown> {
  const sanitized = sanitizeValue(input, privacy) as Record<string, unknown>;
  const context = sanitized.context;

  if (context && typeof context === "object" && !Array.isArray(context)) {
    const contextRecord = context as Record<string, unknown>;
    const allowedSources = new Set(firewall.usedSources.map(normalizeSource));

    if (!allowedSources.has("profile") && !allowedSources.has("profile_onboarding") && !allowedSources.has("profile_summary") && !allowedSources.has("race_goals")) {
      delete contextRecord.profileSummary;
      delete contextRecord.profile;
      delete contextRecord.raceGoals;
      delete contextRecord.raceResults;
    }

    if (!allowedSources.has("pacepilot_activity") && !allowedSources.has("pacepilot_gps") && !allowedSources.has("pacepilot_manual")) {
      delete contextRecord.activity;
      delete contextRecord.activities;
      delete contextRecord.workout;
      delete contextRecord.workouts;
    }

    if (!allowedSources.has("check_ins") && !allowedSources.has("checkins")) {
      delete contextRecord.checkIns;
      delete contextRecord.checkins;
    }

    contextRecord.dataCategoriesUsed = firewall.usedSources;
    contextRecord.excludedSources = firewall.excludedSources;
  }

  return sanitized;
}
