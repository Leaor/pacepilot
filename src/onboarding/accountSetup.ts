import type { Session } from "@supabase/supabase-js";
import { displayNameFromEmail } from "@/account/routeMode";
import { SUPABASE_TABLES } from "@/lib/supabaseTables";
import {
  generateTrainingPlan,
  type ExperienceLevel,
  type GeneratedTrainingPlan,
  type GoalDistance,
  type PlanGeneratorInput,
  type PlanWorkout,
  type StrengthPreference
} from "@/lib/training/planGenerator";

export type OnboardingSetupInput = {
  goalDistance: GoalDistance;
  currentWeeklyMileageKm: number;
  trainingDaysPerWeek: number;
  experienceLevel: ExperienceLevel;
  preferredLongRunDay: string;
  strengthPreference: StrengthPreference;
  injuryCaution: boolean;
  raceDate: string;
  timezone: string;
  units: "km";
};

export type OnboardingSetupResult = {
  ok: boolean;
  message: string;
  plan?: GeneratedTrainingPlan;
};

type MutationResult<T = unknown> = {
  data: T | null;
  error: { message?: string } | null;
};

export type AccountSetupDatabase = {
  from: (table: string) => any;
};

export const defaultOnboardingSetupInput: OnboardingSetupInput = {
  goalDistance: "half",
  currentWeeklyMileageKm: 25,
  trainingDaysPerWeek: 4,
  experienceLevel: "casual",
  preferredLongRunDay: "Sunday",
  strengthPreference: "bodyweight",
  injuryCaution: false,
  raceDate: dateWeeksFromNow(12),
  timezone: getLocalTimezone(),
  units: "km"
};

function getLocalTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function dateWeeksFromNow(weeks: number): string {
  const date = new Date();
  date.setDate(date.getDate() + weeks * 7);
  return date.toISOString().slice(0, 10);
}

function startDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function runDays(count: number, longRunDay: string): string[] {
  const anchors = [longRunDay, "Tuesday", "Thursday", "Saturday", "Monday", "Wednesday", "Friday"];
  return Array.from(new Set(anchors)).slice(0, Math.max(2, Math.min(7, count)));
}

export function setupInputToPlanInput(input: OnboardingSetupInput): PlanGeneratorInput {
  return {
    goalDistance: input.goalDistance,
    raceDate: input.raceDate,
    currentWeeklyMileageKm: input.currentWeeklyMileageKm,
    trainingDaysPerWeek: input.trainingDaysPerWeek,
    experienceLevel: input.experienceLevel,
    preferredLongRunDay: input.preferredLongRunDay,
    strengthPreference: input.strengthPreference,
    injuryCaution: input.injuryCaution,
    startDate: startDate()
  };
}

export function profileRowForSetup(
  userId: string,
  email: string | undefined,
  input: OnboardingSetupInput,
  plan: GeneratedTrainingPlan
): Record<string, unknown> {
  return {
    id: userId,
    email,
    display_name: displayNameFromEmail(email),
    name: displayNameFromEmail(email),
    timezone: input.timezone,
    units: input.units,
    experience_level: input.experienceLevel,
    current_weekly_mileage: input.currentWeeklyMileageKm,
    goal: input.goalDistance,
    race_date: input.raceDate,
    available_run_days: runDays(input.trainingDaysPerWeek, input.preferredLongRunDay),
    preferred_long_run_day: input.preferredLongRunDay,
    strength_preference: input.strengthPreference,
    injury_caution: input.injuryCaution,
    coaching_tone: "calm",
    onboarding_answers: {
      source: "web_onboarding",
      input,
      generatedPlanTitle: plan.title
    },
    updated_at: new Date().toISOString()
  };
}

export function trainingPlanRowForSetup(
  userId: string,
  input: OnboardingSetupInput,
  plan: GeneratedTrainingPlan
): Record<string, unknown> {
  return {
    user_id: userId,
    name: plan.title,
    goal: {
      distance: input.goalDistance,
      raceDate: input.raceDate
    },
    race_date: input.raceDate,
    status: "active",
    plan_json: {
      source: "web_onboarding",
      generatedAt: new Date().toISOString(),
      input,
      plan
    }
  };
}

export function workoutRowsForSetup(userId: string, planId: string, workouts: PlanWorkout[]): Array<Record<string, unknown>> {
  return workouts.map((workout) => ({
    user_id: userId,
    plan_id: planId,
    training_plan_id: planId,
    scheduled_date: workout.date,
    title: workout.title,
    workout_type: workout.type,
    intensity: workout.intensity,
    status: "planned",
    distance_km: workout.distanceKm,
    duration_minutes: workout.durationMinutes,
    target_pace: workout.targetPace ? { range: workout.targetPace } : null,
    steps: [],
    purpose: workout.notes,
    notes: workout.notes
  }));
}

function assertMutation(result: MutationResult, fallbackMessage: string): void {
  if (result.error) {
    throw new Error(fallbackMessage);
  }
}

async function loadDefaultDatabase(): Promise<AccountSetupDatabase> {
  const { supabase } = await import("@/lib/supabase");
  return supabase;
}

export async function saveAccountSetup(
  session: Session | null,
  input: OnboardingSetupInput,
  database?: AccountSetupDatabase
): Promise<OnboardingSetupResult> {
  const userId = session?.user.id;
  if (!userId) {
    return { ok: false, message: "Sign in before creating an account plan." };
  }

  try {
    const activeDatabase = database ?? await loadDefaultDatabase();
    const plan = generateTrainingPlan(setupInputToPlanInput(input));
    const email = session.user.email ?? undefined;

    assertMutation(
      await activeDatabase.from(SUPABASE_TABLES.profiles).upsert(profileRowForSetup(userId, email, input, plan)),
      "Could not save profile setup."
    );

    assertMutation(
      await activeDatabase
        .from(SUPABASE_TABLES.trainingPlans)
        .update({ status: "archived", updated_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("status", "active"),
      "Could not archive previous active plans."
    );

    const planResult = await activeDatabase
      .from(SUPABASE_TABLES.trainingPlans)
      .insert(trainingPlanRowForSetup(userId, input, plan))
      .select("id")
      .single();

    if (planResult.error || typeof planResult.data?.id !== "string") {
      throw new Error("Could not create the training plan.");
    }

    const workouts = plan.weeks.flatMap((week) => week.workouts);
    assertMutation(
      await activeDatabase.from(SUPABASE_TABLES.workouts).insert(workoutRowsForSetup(userId, planResult.data.id, workouts)),
      "Could not save plan workouts."
    );

    return {
      ok: true,
      message: "Your starter plan is saved.",
      plan
    };
  } catch {
    return {
      ok: false,
      message: "Could not save your setup. Please try again."
    };
  }
}
