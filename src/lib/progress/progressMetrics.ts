import type { Activity, CheckIn, Workout } from "@/lib/types";
import { calculatePersonalBests } from "@/lib/progress/personalBests";
import { totalTrainingLoad } from "@/lib/progress/trainingLoad";

export type ProgressDashboardMetrics = {
  weeklyMileageKm: number;
  monthlyMileageKm: number;
  planAdherencePercent: number;
  averageFatigue: number;
  trainingLoad: number;
  consistencyScore: number;
  personalBests: ReturnType<typeof calculatePersonalBests>;
};

export function buildProgressMetrics(activities: Activity[], workouts: Workout[], checkIns: CheckIn[]): ProgressDashboardMetrics {
  const nativeActivities = activities.filter((activity) => activity.source !== "strava_cache");
  const completed = workouts.filter((workout) => workout.status === "completed").length;
  const planned = workouts.filter((workout) => workout.status !== "skipped").length || 1;
  const averageFatigue = checkIns.length
    ? Math.round((checkIns.reduce((sum, checkIn) => sum + checkIn.fatigue, 0) / checkIns.length) * 10) / 10
    : 0;
  const weeklyMileageKm = Math.round(nativeActivities.slice(0, 7).reduce((sum, activity) => sum + activity.distanceKm, 0) * 10) / 10;
  const monthlyMileageKm = Math.round(nativeActivities.reduce((sum, activity) => sum + activity.distanceKm, 0) * 10) / 10;
  const planAdherencePercent = Math.round((completed / planned) * 100);

  return {
    weeklyMileageKm,
    monthlyMileageKm,
    planAdherencePercent,
    averageFatigue,
    trainingLoad: totalTrainingLoad(nativeActivities),
    consistencyScore: Math.max(0, Math.min(100, Math.round(planAdherencePercent - Math.max(0, averageFatigue - 3) * 8))),
    personalBests: calculatePersonalBests(nativeActivities)
  };
}
