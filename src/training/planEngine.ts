import type {
  CheckIn,
  CoachMemoryItem,
  PlanConfidence,
  RaceOutcome,
  Workout,
  WorkoutPurpose
} from "@/lib/types";

export type PlanConfidenceInput = {
  currentWeeklyMileageKm: number;
  previousWeeklyMileageKm: number;
  missedWorkoutsLast14Days: number;
  completedWorkoutsLast14Days: number;
  longRunKm: number;
  targetRaceDistanceKm: number;
  hardWorkoutsThisWeek: number;
  easyWorkoutsThisWeek: number;
  latestCheckIn?: CheckIn;
};

export type SafetyContext = {
  previousWeeklyMileageKm: number;
  proposedWeeklyMileageKm: number;
  hardWorkoutsPrevious48Hours: number;
  latestCheckIn?: CheckIn;
  weeksUntilRace?: number;
};

export type SafetyResult = {
  allowed: boolean;
  blockedReasons: string[];
  adjustedWeeklyMileageKm: number;
};

export type ReadinessRecommendation = {
  action: "proceed" | "reduce" | "swap_easy" | "rest";
  reason: string;
};

const maxWeeklyMileageIncrease = 0.1;

const purposeLabels: Record<WorkoutPurpose, string> = {
  aerobic_base: "Build aerobic base while keeping stress controlled.",
  threshold: "Improve sustainable speed near race effort.",
  vo2: "Develop high-end aerobic power with controlled intervals.",
  recovery: "Absorb training without adding meaningful fatigue.",
  long_run_endurance: "Extend endurance and prepare your legs for race duration.",
  taper_sharpening: "Stay sharp while reducing total load before race day.",
  race_specific_prep: "Practice the terrain, rhythm, and demands of your target race.",
  strength_mobility: "Improve durability and support consistent running."
};

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function calculatePlanConfidence(input: PlanConfidenceInput): PlanConfidence {
  const signals: string[] = [];
  const warnings: string[] = [];
  let score = 74;

  const completedTotal = input.completedWorkoutsLast14Days + input.missedWorkoutsLast14Days;
  const adherence = completedTotal === 0 ? 1 : input.completedWorkoutsLast14Days / completedTotal;

  if (adherence >= 0.85) {
    score += 10;
    signals.push("Strong recent adherence");
  } else if (adherence < 0.65) {
    score -= 15;
    warnings.push("Recent missed workouts reduce plan confidence");
  }

  const mileageIncrease =
    input.previousWeeklyMileageKm > 0
      ? (input.currentWeeklyMileageKm - input.previousWeeklyMileageKm) / input.previousWeeklyMileageKm
      : 0;

  if (mileageIncrease > maxWeeklyMileageIncrease) {
    score -= 16;
    warnings.push("Weekly load is rising faster than the safety limit");
  } else {
    signals.push("Weekly load is progressing within the safety limit");
  }

  const longRunReadiness = input.targetRaceDistanceKm > 0 ? input.longRunKm / input.targetRaceDistanceKm : 0;
  if (longRunReadiness >= 0.65) {
    score += 8;
    signals.push("Long-run progression supports the goal distance");
  } else {
    score -= 8;
    warnings.push("Long-run progression needs more runway");
  }

  if (input.hardWorkoutsThisWeek > input.easyWorkoutsThisWeek) {
    score -= 8;
    warnings.push("Hard sessions outweigh easy running this week");
  } else {
    signals.push("Easy and hard balance is controlled");
  }

  if (input.latestCheckIn?.injuryConcern) {
    score -= 24;
    warnings.push("Injury concern should pause hard training decisions");
  } else if (input.latestCheckIn && input.latestCheckIn.fatigue <= 2 && input.latestCheckIn.soreness <= 2) {
    score += 6;
    signals.push("Readiness check-in supports normal training");
  }

  const finalScore = clampScore(score);
  const level = finalScore >= 78 ? "high" : finalScore >= 55 ? "moderate" : "low";
  const summary =
    level === "high"
      ? "Training is on track with controlled load and useful readiness signals."
      : level === "moderate"
        ? "Training is mostly on track, but one or two signals need attention."
        : "Training confidence is low; reduce risk before adding more load.";

  return {
    score: finalScore,
    level,
    summary,
    signals,
    warnings
  };
}

export function enforceTrainingSafety(context: SafetyContext): SafetyResult {
  const blockedReasons: string[] = [];
  const maxMileage =
    context.previousWeeklyMileageKm > 0
      ? context.previousWeeklyMileageKm * (1 + maxWeeklyMileageIncrease)
      : context.proposedWeeklyMileageKm;

  if (context.proposedWeeklyMileageKm > maxMileage) {
    blockedReasons.push("Proposed weekly mileage exceeds the 10% progression limit");
  }

  if (context.hardWorkoutsPrevious48Hours > 0) {
    blockedReasons.push("A hard workout already occurred in the previous 48 hours");
  }

  if (context.latestCheckIn?.injuryConcern) {
    blockedReasons.push("Injury concern blocks hard or higher-load recommendations");
  }

  if (context.latestCheckIn && context.latestCheckIn.fatigue >= 4) {
    blockedReasons.push("High fatigue blocks hard training escalation");
  }

  if (typeof context.weeksUntilRace === "number" && context.weeksUntilRace <= 2) {
    if (context.proposedWeeklyMileageKm > context.previousWeeklyMileageKm) {
      blockedReasons.push("Race taper blocks increased weekly load");
    }
  }

  return {
    allowed: blockedReasons.length === 0,
    blockedReasons,
    adjustedWeeklyMileageKm: Math.min(context.proposedWeeklyMileageKm, maxMileage)
  };
}

export function recommendWorkoutReadiness(checkIn: CheckIn, workout: Workout): ReadinessRecommendation {
  if (checkIn.injuryConcern) {
    return {
      action: "rest",
      reason: "An injury concern should pause the planned workout and avoid medical interpretation."
    };
  }

  if (checkIn.fatigue >= 5 || checkIn.soreness >= 5) {
    return {
      action: "rest",
      reason: "Very high fatigue or soreness makes rest the safest training choice."
    };
  }

  if (workout.intensity === "hard" && (checkIn.fatigue >= 4 || checkIn.soreness >= 4 || checkIn.sleepHours < 6)) {
    return {
      action: "swap_easy",
      reason: "Readiness is too low for a hard workout, so an easy run protects consistency."
    };
  }

  if (checkIn.fatigue >= 3 || checkIn.soreness >= 3 || checkIn.sleepHours < 6.5) {
    return {
      action: "reduce",
      reason: "Moderate readiness flags suggest reducing volume or intensity today."
    };
  }

  return {
    action: "proceed",
    reason: "Readiness supports the planned session."
  };
}

export function explainWorkout(workout: Workout): string {
  return purposeLabels[workout.purpose];
}

export function adaptAfterMissedWorkout(workout: Workout, nextWorkout?: Workout): {
  changedWorkout: Workout;
  explanation: string;
} {
  if (workout.status !== "missed") {
    return {
      changedWorkout: workout,
      explanation: "No adaptation was needed because the workout was not missed."
    };
  }

  if (workout.intensity === "hard") {
    return {
      changedWorkout: {
        ...workout,
        status: "swapped",
        type: "easy",
        intensity: "easy",
        purpose: "recovery",
        title: "Easy recovery replacement"
      },
      explanation: "The missed hard workout was not stacked onto the next session; it was replaced with easy running."
    };
  }

  if (nextWorkout?.intensity === "hard") {
    return {
      changedWorkout: {
        ...workout,
        status: "swapped",
        type: "rest",
        intensity: "easy",
        purpose: "recovery",
        title: "Rest before key session"
      },
      explanation: "The missed workout was removed to protect the upcoming key workout."
    };
  }

  return {
    changedWorkout: {
      ...workout,
      status: "swapped",
      distanceKm: workout.distanceKm ? Math.round(workout.distanceKm * 0.75 * 10) / 10 : workout.distanceKm
    },
    explanation: "The missed workout was reduced instead of moved forward to avoid load stacking."
  };
}

export function raceOutcomeToCoachMemory(outcome: RaceOutcome): CoachMemoryItem {
  const valueByOutcome: Record<RaceOutcome, string> = {
    finished_strong: "Race execution was strong late; future plans can preserve current pacing discipline.",
    faded_late: "Late-race fade suggests more endurance progression and fueling practice.",
    pacing_issue: "Pacing issue suggests more race-effort practice and conservative opening splits.",
    fueling_issue: "Fueling issue suggests race-specific nutrition reminders and long-run practice.",
    weather_issue: "Weather affected race execution; future strategy should include contingency pacing.",
    terrain_mismatch: "Terrain mismatch suggests adding race-specific hill or surface preparation.",
    injury_or_soreness: "Race soreness or injury concern should lower near-term training stress."
  };

  return {
    id: `race-${outcome}`,
    label: "Race learning",
    value: valueByOutcome[outcome],
    source: "race_result",
    userEditable: true
  };
}
