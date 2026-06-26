export type WeeklyAdjustmentInput = {
  fatigue: number;
  soreness: number;
  sleepQuality: number;
  motivation: number;
  perceivedDifficulty: "too_easy" | "just_right" | "too_hard";
  missedWorkouts: number;
  extraMileageKm: number;
  desiredNextWeek: "push" | "maintain" | "recover";
};

export type WeeklyAdjustment = {
  loadMultiplier: number;
  intensityMultiplier: number;
  addMobility: boolean;
  message: string;
};

export function createWeeklyAdjustment(input: WeeklyAdjustmentInput): WeeklyAdjustment {
  if (input.soreness >= 4 || input.sleepQuality <= 2) {
    return {
      loadMultiplier: 0.82,
      intensityMultiplier: 0.5,
      addMobility: true,
      message: "Next week shifts lighter because soreness or poor sleep raises training risk."
    };
  }

  if (input.fatigue >= 4 || input.perceivedDifficulty === "too_hard" || input.desiredNextWeek === "recover") {
    return {
      loadMultiplier: 0.88,
      intensityMultiplier: 0.65,
      addMobility: true,
      message: "Reduce intensity and protect consistency; missed workouts will not be crammed forward."
    };
  }

  if (input.missedWorkouts > 0) {
    return {
      loadMultiplier: 0.95,
      intensityMultiplier: 0.8,
      addMobility: false,
      message: "Hold the line and avoid making up missed workouts all at once."
    };
  }

  if (input.extraMileageKm > 5) {
    return {
      loadMultiplier: 1,
      intensityMultiplier: 0.8,
      addMobility: false,
      message: "Keep total load stable because extra mileage already added stress."
    };
  }

  if (input.desiredNextWeek === "push" && input.fatigue <= 2) {
    return {
      loadMultiplier: 1.05,
      intensityMultiplier: 1,
      addMobility: false,
      message: "A small progression is reasonable after stable readiness signals."
    };
  }

  return {
    loadMultiplier: 1,
    intensityMultiplier: 1,
    addMobility: false,
    message: "Maintain the plan and keep collecting readiness signals."
  };
}
