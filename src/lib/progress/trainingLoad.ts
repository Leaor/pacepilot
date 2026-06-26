import type { Activity } from "@/lib/types";

export function estimateTrainingLoad(activity: Activity): number {
  const effort = activity.perceivedEffort ?? 4;
  const minutes = activity.durationSeconds / 60;
  return Math.round(minutes * effort);
}

export function totalTrainingLoad(activities: Activity[]): number {
  return activities.reduce((sum, activity) => sum + estimateTrainingLoad(activity), 0);
}
