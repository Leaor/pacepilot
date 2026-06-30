import { applyAiDataFirewall, sanitizeAiRequestInput, type AiPrivacySnapshot } from "./aiFirewall.ts";

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const privacy: AiPrivacySnapshot = {
  ai_can_use_pacepilot_activity_history: true,
  ai_can_use_checkins: false,
  ai_can_use_race_goals: false,
  ai_can_use_chat_history: false,
  ai_can_use_user_provided_imports: false,
  ai_can_use_garmin_data: false,
  ai_can_use_apple_health_data: false
};

Deno.test("AI firewall blocks Strava and privacy-disallowed sources", () => {
  const firewall = applyAiDataFirewall([
    "pacepilot_gps",
    "strava_cache",
    "garmin_import",
    "profile_onboarding"
  ], privacy);

  assert(firewall.usedSources.length === 1 && firewall.usedSources[0] === "pacepilot_gps", "expected only PacePilot GPS source");
  assert(firewall.excludedSources.includes("strava_cache"), "expected Strava exclusion");
  assert(firewall.excludedSources.includes("garmin_import"), "expected Garmin exclusion");
  assert(firewall.excludedSources.includes("profile_onboarding"), "expected profile exclusion");
});

Deno.test("AI firewall sanitizes request context before OpenAI", () => {
  const firewall = applyAiDataFirewall(["pacepilot_gps", "profile_onboarding", "garmin_import"], privacy);
  const input = {
    question: "How should I adjust this week?",
    context: {
      profileSummary: "Marathon goal, 48 km per week",
      dataCategoriesUsed: ["pacepilot_gps", "profile_onboarding", "garmin_import"],
      activities: [
        { source: "pacepilot_gps", distanceKm: 8 },
        { source: "strava_cache", distanceKm: 12, strava_access_token: "secret" },
        { source: "garmin_import", distanceKm: 6 }
      ],
      checkIns: [{ fatigue: 4 }]
    }
  };

  const sanitized = sanitizeAiRequestInput(input, privacy, firewall);
  const context = sanitized.context as Record<string, unknown>;
  const activities = context.activities as Array<Record<string, unknown>>;

  assert(!("profileSummary" in context), "expected profile summary to be removed without race-goal consent");
  assert(!("checkIns" in context), "expected check-ins to be removed without consent");
  assert(activities.length === 1, "expected only one allowed activity");
  assert(activities[0].source === "pacepilot_gps", "expected PacePilot GPS activity to remain");
  assert((context.dataCategoriesUsed as string[]).length === 1, "expected sanitized used categories");
  assert((context.excludedSources as string[]).includes("strava_cache"), "expected sanitized excluded categories");
});

Deno.test("AI firewall keeps profile summary when race-goal consent is present", () => {
  const permissivePrivacy = {
    ...privacy,
    ai_can_use_race_goals: true
  };
  const firewall = applyAiDataFirewall(["profile_onboarding"], permissivePrivacy);
  const sanitized = sanitizeAiRequestInput({
    context: {
      profileSummary: "Half marathon goal"
    }
  }, permissivePrivacy, firewall);
  const context = sanitized.context as Record<string, unknown>;

  assert(context.profileSummary === "Half marathon goal", "expected profile summary to remain with consent");
});
