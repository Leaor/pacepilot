import { describe, expect, it } from "vitest";
import { blockedStravaAnalysisMessage } from "@/lib/ai/safetyGuards";
import { assertNoStravaData, buildAiContextFromAllowedSources, filterActivitiesForAi } from "@/lib/ai/aiDataPolicy";
import { calculateRaceReadiness } from "@/lib/race/raceReadiness";
import { buildRaceStrategy } from "@/lib/race/raceStrategyBuilder";
import { summarizeShoeMileage } from "@/lib/gear/shoeMileage";
import { applyLifeMode } from "@/lib/training/lifeMode";
import { generateTrainingPlan } from "@/lib/training/planGenerator";
import { calculatePaceZones } from "@/lib/training/paceEngine";
import { demoActivities } from "@/data/demo";
import { defaultPrivacyPreferences } from "@/privacy/defaults";
import { canAnalyzeActivityWithAi } from "@/lib/strava/stravaPolicy";

const aiPreferences = {
  ...defaultPrivacyPreferences,
  aiCoachEnabled: true,
  allowActivityDataForAi: true
};

describe("PacePilot MVP engines", () => {
  it("generates a safe multi-week plan with recovery and taper phases", () => {
    const plan = generateTrainingPlan({
      goalDistance: "half",
      raceDate: "2026-10-18",
      currentWeeklyMileageKm: 28,
      trainingDaysPerWeek: 4,
      experienceLevel: "intermediate",
      preferredLongRunDay: "Sunday",
      strengthPreference: "bodyweight",
      startDate: "2026-06-23"
    });

    expect(plan.weeks.length).toBeGreaterThanOrEqual(6);
    expect(plan.weeks.length).toBeLessThanOrEqual(26);
    expect(plan.weeks.some((week) => week.phase === "recovery")).toBe(true);
    expect(plan.weeks.at(-1)?.phase).toBe("race");
    expect(plan.disclaimer).toContain("not medical advice");
  });

  it("calculates pace zones from user-provided race data", () => {
    const zones = calculatePaceZones({
      goalDistanceKm: 10,
      recentRaceResult: {
        distanceKm: 5,
        timeSeconds: 1500,
        source: "user_provided_import"
      }
    });

    expect(zones.easy.maxSecondsPerKm).toBeGreaterThan(zones.racePace);
    expect(zones.interval.minSecondsPerKm).toBeLessThan(zones.racePace);
  });

  it("maps Life Mode sick day to rest", () => {
    const result = applyLifeMode("sick");

    expect(result.suggestedAction).toBe("rest");
  });

  it("keeps Strava cache out of AI context and blocks direct analysis", () => {
    const filtered = filterActivitiesForAi(demoActivities);
    const stravaActivity = demoActivities.find((activity) => activity.source === "strava_cache");
    const context = buildAiContextFromAllowedSources("user-1", { activities: demoActivities }, aiPreferences);

    expect(filtered.every((activity) => activity.source !== "strava_cache")).toBe(true);
    expect(context.activities.every((activity) => activity.source !== "strava_cache")).toBe(true);
    expect(() => assertNoStravaData({ source: "strava_cache" })).toThrow("Blocked Strava");
    expect(stravaActivity ? canAnalyzeActivityWithAi(stravaActivity).reason : "").toBe(blockedStravaAnalysisMessage());
  });

  it("builds race strategy splits that preserve total goal time", () => {
    const strategy = buildRaceStrategy({
      distanceKm: 10,
      goalTimeSeconds: 2700,
      pacingStyle: "negative_split"
    });

    expect(strategy.splits.reduce((sum, split) => sum + split.targetSeconds, 0)).toBe(2700);
    expect(strategy.splits[0].targetSeconds).toBeGreaterThan(strategy.splits.at(-1)?.targetSeconds ?? 0);
  });

  it("scores race readiness without claiming a guaranteed outcome", () => {
    const readiness = calculateRaceReadiness({
      planAdherencePercent: 88,
      recentLongRunRatio: 0.72,
      weeklyMileageConsistencyPercent: 80,
      fatigue: 2,
      soreness: 2,
      sleepQuality: 4,
      missedWorkouts: 1,
      paceProgressPercent: 6,
      taperStatus: "in_taper",
      daysUntilRace: 12
    });

    expect(readiness.score).toBeGreaterThan(70);
    expect(readiness.recommendedAction).not.toContain("guarantee");
  });

  it("warns when a shoe is near retirement mileage", () => {
    const summary = summarizeShoeMileage(
      {
        id: "shoe-1",
        brand: "Pace",
        model: "Trainer",
        startingDistanceKm: 500,
        retirementDistanceKm: 650,
        retired: false
      },
      [72, 12]
    );

    expect(summary.retirementWarning).toBe(true);
  });
});
