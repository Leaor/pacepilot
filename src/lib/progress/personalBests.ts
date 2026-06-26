import type { Activity } from "@/lib/types";

export type PersonalBest = {
  label: string;
  value: string;
  activityId: string;
};

export function calculatePersonalBests(activities: Activity[]): PersonalBest[] {
  const nativeActivities = activities.filter(
    (activity) => activity.source === "pacepilot_gps" || activity.source === "pacepilot_manual" || activity.source === "user_provided_import"
  );
  const longest = nativeActivities.reduce<Activity | undefined>(
    (best, activity) => (!best || activity.distanceKm > best.distanceKm ? activity : best),
    undefined
  );
  const fastest = nativeActivities
    .filter((activity) => activity.averagePaceSecondsPerKm)
    .reduce<Activity | undefined>(
      (best, activity) =>
        !best || (activity.averagePaceSecondsPerKm ?? Infinity) < (best.averagePaceSecondsPerKm ?? Infinity) ? activity : best,
      undefined
    );

  return [
    longest ? { label: "Longest Run", value: `${longest.distanceKm} km`, activityId: longest.id } : undefined,
    fastest ? { label: "Fastest Average Pace", value: `${fastest.averagePaceSecondsPerKm}s/km`, activityId: fastest.id } : undefined
  ].filter((item): item is PersonalBest => Boolean(item));
}
