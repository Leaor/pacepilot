export type SubscriptionTier = "free" | "pro" | "elite";

export type ActivitySource =
  | "pacepilot_gps"
  | "pacepilot_manual"
  | "strava_cache"
  | "garmin_import"
  | "apple_health_import"
  | "user_provided_import";

export type WorkoutType =
  | "easy"
  | "recovery"
  | "long"
  | "tempo"
  | "intervals"
  | "hills"
  | "race_pace"
  | "strides"
  | "tune_up_race"
  | "race"
  | "strength"
  | "mobility"
  | "rest";

export type WorkoutIntensity = "easy" | "moderate" | "hard";

export type WorkoutStatus = "planned" | "completed" | "missed" | "skipped" | "swapped";

export type WorkoutPurpose =
  | "aerobic_base"
  | "threshold"
  | "vo2"
  | "recovery"
  | "long_run_endurance"
  | "taper_sharpening"
  | "race_specific_prep"
  | "strength_mobility";

export type Workout = {
  id: string;
  title: string;
  scheduledDate: string;
  type: WorkoutType;
  intensity: WorkoutIntensity;
  status: WorkoutStatus;
  purpose: WorkoutPurpose;
  distanceKm?: number;
  durationMinutes?: number;
  notes?: string;
};

export type Activity = {
  id: string;
  source: ActivitySource;
  startedAt: string;
  title?: string;
  distanceKm: number;
  durationSeconds: number;
  averagePaceSecondsPerKm?: number;
  elevationGainMeters?: number;
  avgHeartRate?: number;
  perceivedEffort?: number;
  fatigueAfter?: number;
  notes?: string;
  shoeId?: string;
};

export type CheckIn = {
  fatigue: number;
  soreness: number;
  sleepHours: number;
  motivation: number;
  injuryConcern: boolean;
};

export type RaceOutcome =
  | "finished_strong"
  | "faded_late"
  | "pacing_issue"
  | "fueling_issue"
  | "weather_issue"
  | "terrain_mismatch"
  | "injury_or_soreness";

export type PrivacyPreferences = {
  profilePrivate: boolean;
  activityPrivate: boolean;
  marketingOptIn: boolean;
  analyticsOptIn: boolean;
  aiCoachEnabled: boolean;
  allowActivityDataForAi: boolean;
  allowCheckInsForAi: boolean;
  allowProfileForAi: boolean;
  saveAiChatHistory: boolean;
  gpsRouteStorageEnabled: boolean;
};

export type CoachMemoryItem = {
  id: string;
  label: string;
  value: string;
  source: "onboarding" | "race_result" | "check_in" | "plan_adjustment" | "user_edit";
  userEditable: boolean;
};

export type PlanConfidence = {
  score: number;
  level: "low" | "moderate" | "high";
  summary: string;
  signals: string[];
  warnings: string[];
};
