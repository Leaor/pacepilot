import { describe, expect, it } from "vitest";
import { filterAiContext, assertNoStravaData } from "@/ai/dataBoundaries";
import { buildAiPromptPayload } from "@/ai/promptBuilder";
import { evaluateAiCoachGate } from "@/ai/gating";
import { canSpendAiRequest, usageFallbackMessage } from "@/ai/usageLimits";
import { demoActivities, demoCheckIn, demoCoachMemory } from "@/data/demo";
import { defaultPrivacyPreferences } from "@/privacy/defaults";

const enabledPreferences = {
  ...defaultPrivacyPreferences,
  aiCoachEnabled: true,
  allowActivityDataForAi: true,
  allowCheckInsForAi: true,
  allowProfileForAi: true
};

describe("AI boundaries", () => {
  it("excludes Strava activities even when activity data is allowed", () => {
    const context = filterAiContext(
      {
        activities: demoActivities,
        checkIns: [demoCheckIn],
        profile: { goal: "Half marathon" }
      },
      enabledPreferences
    );

    expect(context.activities.every((activity) => activity.source !== "strava_cache")).toBe(true);
    expect(() => assertNoStravaData(context)).not.toThrow();
    expect(context.dataCategoriesUsed).toContain("pacepilot_activity");
  });

  it("does not include any data when AI Coach is disabled", () => {
    const context = filterAiContext(
      {
        activities: demoActivities,
        checkIns: [demoCheckIn],
        profile: { goal: "Half marathon" }
      },
      defaultPrivacyPreferences
    );

    expect(context.activities).toHaveLength(0);
    expect(context.checkIns).toHaveLength(0);
    expect(context.profile).toBeUndefined();
  });

  it("does not include sensitive context groups without their specific consent", () => {
    const context = filterAiContext(
      {
        activities: demoActivities,
        checkIns: [demoCheckIn],
        profile: { goal: "Half marathon" },
        raceResults: [{ outcome: "pacing_issue" }],
        planHistory: [{ change: "load capped" }],
        coachMemory: demoCoachMemory
      },
      {
        ...defaultPrivacyPreferences,
        aiCoachEnabled: true
      }
    );

    expect(context.activities).toHaveLength(0);
    expect(context.checkIns).toHaveLength(0);
    expect(context.profile).toBeUndefined();
    expect(context.raceResults).toHaveLength(0);
    expect(context.planHistory).toHaveLength(0);
    expect(context.coachMemory).toHaveLength(0);
    expect(context.dataCategoriesUsed).toHaveLength(0);
  });

  it("rejects nested Strava tokens and protected source labels", () => {
    const context = filterAiContext(
      {
        activities: demoActivities,
        checkIns: [demoCheckIn],
        profile: { strava_access_token: "secret" }
      },
      enabledPreferences
    );

    expect(() => assertNoStravaData(context)).toThrow("Strava");
  });

  it("requires Pro or Elite and user opt-in for AI Coach", () => {
    expect(evaluateAiCoachGate("free", enabledPreferences).allowed).toBe(false);
    expect(evaluateAiCoachGate("pro", enabledPreferences).allowed).toBe(false);
    expect(evaluateAiCoachGate("elite", defaultPrivacyPreferences).allowed).toBe(false);
    expect(evaluateAiCoachGate("elite", enabledPreferences).allowed).toBe(true);
  });

  it("adds safety boundaries to prompt payloads", () => {
    const context = filterAiContext({ activities: demoActivities, checkIns: [demoCheckIn] }, enabledPreferences);
    const payload = buildAiPromptPayload("weekly_analysis", context);

    expect(payload.safetyBoundary).toContain("not medical advice");
  });

  it("enforces monthly AI request limits by tier", () => {
    expect(canSpendAiRequest({ tier: "pro", feature: "race_strategy", usedThisMonth: 0 })).toBe(false);
    expect(canSpendAiRequest({ tier: "elite", feature: "race_strategy", usedThisMonth: 11 })).toBe(true);
    expect(usageFallbackMessage({ tier: "pro", feature: "race_strategy", usedThisMonth: 0 })).toContain("not included");
  });
});
