import type { PlanWorkout } from "@/lib/training/planGenerator";

export type WorkoutCue = {
  atPercent: number;
  message: string;
};

export function buildWorkoutCues(workout: PlanWorkout): WorkoutCue[] {
  const base: WorkoutCue[] = [
    { atPercent: 0, message: `Start ${workout.title}. Keep the first minute relaxed.` },
    { atPercent: 50, message: "Halfway. Check posture and effort." },
    { atPercent: 90, message: "Final push. Stay smooth." },
    { atPercent: 100, message: "Workout complete. Cool down and save how you felt." }
  ];

  if (workout.type === "intervals" || workout.type === "tempo") {
    base.splice(1, 0, { atPercent: 25, message: "Settle into the target range without forcing it." });
  }

  if (workout.type === "race") {
    base.splice(2, 0, { atPercent: 75, message: "Commit to your race plan, not one split." });
  }

  return base;
}
