import type { Activity, CheckIn, CoachMemoryItem, SubscriptionTier, Workout } from "@/lib/types";

export const demoTier: SubscriptionTier = "elite";

export const demoCheckIn: CheckIn = {
  fatigue: 2,
  soreness: 1,
  sleepHours: 7.4,
  motivation: 4,
  injuryConcern: false
};

export const demoWorkouts: Workout[] = [
  {
    id: "w1",
    title: "Threshold tempo",
    scheduledDate: "2026-06-23",
    type: "tempo",
    intensity: "hard",
    status: "planned",
    purpose: "threshold",
    distanceKm: 8,
    durationMinutes: 40,
    notes: "10 min easy, 4 x 5 min steady, 10 min easy."
  },
  {
    id: "w2",
    title: "Easy aerobic run",
    scheduledDate: "2026-06-25",
    type: "easy",
    intensity: "easy",
    status: "planned",
    purpose: "aerobic_base",
    distanceKm: 6
  },
  {
    id: "w3",
    title: "Progressive long run",
    scheduledDate: "2026-06-28",
    type: "long",
    intensity: "moderate",
    status: "planned",
    purpose: "long_run_endurance",
    distanceKm: 16
  }
];

export const demoActivities: Activity[] = [
  {
    id: "a1",
    source: "pacepilot_gps",
    title: "Sunday long run",
    startedAt: "2026-06-21T12:30:00Z",
    distanceKm: 14,
    durationSeconds: 4860,
    averagePaceSecondsPerKm: 347,
    perceivedEffort: 6,
    fatigueAfter: 3
  },
  {
    id: "a2",
    source: "strava_cache",
    title: "Strava Sync display",
    startedAt: "2026-06-18T12:30:00Z",
    distanceKm: 8,
    durationSeconds: 2700,
    averagePaceSecondsPerKm: 338
  },
  {
    id: "a3",
    source: "pacepilot_manual",
    title: "Manual recovery jog",
    startedAt: "2026-06-16T12:30:00Z",
    distanceKm: 5,
    durationSeconds: 1740,
    perceivedEffort: 3,
    fatigueAfter: 1
  }
];

export const demoCoachMemory: CoachMemoryItem[] = [
  {
    id: "cm1",
    label: "Goal race",
    value: "Half marathon in 10 weeks",
    source: "onboarding",
    userEditable: true
  },
  {
    id: "cm2",
    label: "Preferred long run day",
    value: "Sunday",
    source: "user_edit",
    userEditable: true
  },
  {
    id: "cm3",
    label: "Recent learning",
    value: "Late-race fade after hilly courses",
    source: "race_result",
    userEditable: true
  }
];
