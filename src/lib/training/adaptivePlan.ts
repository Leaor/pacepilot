import type { Activity, CheckIn } from "@/lib/types";
import type { PlanWorkout } from "@/lib/training/planGenerator";

export type AdaptiveSuggestion = {
  action: "skip" | "move" | "reduce" | "swap_easy" | "rest" | "rebuild_week";
  title: string;
  explanation: string;
  adjustedWorkout?: PlanWorkout;
};

export type AdaptivePlanInput = {
  workout: PlanWorkout;
  nextWorkout?: PlanWorkout;
  recentActivities?: Activity[];
  latestCheckIn?: CheckIn;
  missedWorkoutsThisWeek?: number;
};

export function suggestAdaptivePlanChange(input: AdaptivePlanInput): AdaptiveSuggestion {
  const { workout, nextWorkout, latestCheckIn } = input;

  if (latestCheckIn?.injuryConcern || latestCheckIn?.soreness === 5) {
    return {
      action: "rest",
      title: "Protect the week",
      explanation: "PacePilot avoids hard training when injury concern or very high soreness is present.",
      adjustedWorkout: { ...workout, type: "rest", title: "Rest", intensity: "easy", distanceKm: undefined }
    };
  }

  if ((input.missedWorkoutsThisWeek ?? 0) >= 2) {
    return {
      action: "rebuild_week",
      title: "Rebuild this week",
      explanation: "Missed sessions should not be crammed into the next few days; rebuild around the long run."
    };
  }

  if (latestCheckIn && latestCheckIn.fatigue >= 4) {
    return {
      action: workout.intensity === "hard" ? "swap_easy" : "reduce",
      title: workout.intensity === "hard" ? "Swap to easy" : "Reduce volume",
      explanation: "High fatigue lowers the next workout before adding more stress.",
      adjustedWorkout: {
        ...workout,
        type: workout.intensity === "hard" ? "easy" : workout.type,
        title: workout.intensity === "hard" ? "Easy replacement" : workout.title,
        intensity: "easy",
        distanceKm: workout.distanceKm ? Math.round(workout.distanceKm * 0.7 * 10) / 10 : workout.distanceKm
      }
    };
  }

  const extraMileage = (input.recentActivities ?? []).reduce((sum, activity) => sum + activity.distanceKm, 0);
  if (extraMileage > 1.25 * (workout.distanceKm ?? 6) && nextWorkout?.intensity === "hard") {
    return {
      action: "move",
      title: "Move the hard workout",
      explanation: "Extra mileage is already in the legs, so the next hard session should move away from stacked load."
    };
  }

  return {
    action: "skip",
    title: "Keep the plan simple",
    explanation: "No risky signal was detected. If the workout was missed, skip it rather than stacking it."
  };
}
