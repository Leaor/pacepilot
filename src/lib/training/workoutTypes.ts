import type { WorkoutType } from "@/lib/types";

export const workoutTypeLabels: Record<WorkoutType, string> = {
  easy: "Easy Run",
  recovery: "Recovery Run",
  long: "Long Run",
  tempo: "Tempo Run",
  intervals: "Intervals",
  hills: "Hills",
  race_pace: "Race Pace",
  strides: "Strides",
  tune_up_race: "Tune-up Race",
  race: "Race",
  strength: "Strength",
  mobility: "Mobility",
  rest: "Rest"
};

export const hardWorkoutTypes: WorkoutType[] = ["tempo", "intervals", "hills", "race_pace", "tune_up_race", "race"];
