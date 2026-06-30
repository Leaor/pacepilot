import type { Session } from "@supabase/supabase-js";
import { SUPABASE_TABLES } from "@/lib/supabaseTables";

export type AccountPlanWorkout = {
  id: string;
  scheduledDate: string;
  title: string;
  workoutType: string;
  intensity: "easy" | "moderate" | "hard";
  status: string;
  distanceKm?: number;
  durationMinutes?: number;
  targetPace?: string;
  purpose?: string;
  notes?: string;
};

export type AccountPlan = {
  id: string;
  name: string;
  raceDate?: string;
  status: string;
  planJson?: unknown;
  workouts: AccountPlanWorkout[];
};

export type AccountPlanResult = {
  ok: boolean;
  message: string;
  plan?: AccountPlan;
};

export type AccountPlanDatabase = {
  from: (table: string) => any;
};

async function loadDefaultDatabase(): Promise<AccountPlanDatabase> {
  const { supabase } = await import("@/lib/supabase");
  return supabase;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function normalizeIntensity(value: unknown): AccountPlanWorkout["intensity"] {
  return value === "moderate" || value === "hard" ? value : "easy";
}

function targetPaceFromRow(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value === "object") {
    const range = (value as { range?: unknown }).range;
    return asString(range);
  }

  return undefined;
}

export function normalizePlanRow(row: unknown): Omit<AccountPlan, "workouts"> | null {
  if (!row || typeof row !== "object") {
    return null;
  }

  const record = row as Record<string, unknown>;
  const id = asString(record.id);
  const name = asString(record.name);

  if (!id || !name) {
    return null;
  }

  return {
    id,
    name,
    raceDate: asString(record.race_date),
    status: asString(record.status) ?? "active",
    planJson: record.plan_json
  };
}

export function normalizeWorkoutRows(rows: unknown): AccountPlanWorkout[] {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows
    .map((row): AccountPlanWorkout | null => {
      if (!row || typeof row !== "object") {
        return null;
      }

      const record = row as Record<string, unknown>;
      const id = asString(record.id);
      const scheduledDate = asString(record.scheduled_date);
      const title = asString(record.title);

      if (!id || !scheduledDate || !title) {
        return null;
      }

      return {
        id,
        scheduledDate,
        title,
        workoutType: asString(record.workout_type) ?? "easy",
        intensity: normalizeIntensity(record.intensity),
        status: asString(record.status) ?? "planned",
        distanceKm: asNumber(record.distance_km),
        durationMinutes: asNumber(record.duration_minutes),
        targetPace: targetPaceFromRow(record.target_pace),
        purpose: asString(record.purpose),
        notes: asString(record.notes)
      };
    })
    .filter((workout): workout is AccountPlanWorkout => Boolean(workout))
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
}

function shouldFallbackToLegacyPlanId(error: unknown): boolean {
  const message = typeof error === "object" && error
    ? String((error as { message?: unknown }).message ?? "")
    : "";
  return /training_plan_id|schema cache|column/i.test(message);
}

async function loadWorkoutRows(database: AccountPlanDatabase, userId: string, planId: string): Promise<AccountPlanWorkout[]> {
  const primary = await database
    .from(SUPABASE_TABLES.workouts)
    .select("id,scheduled_date,title,workout_type,intensity,status,distance_km,duration_minutes,target_pace,purpose,notes")
    .eq("user_id", userId)
    .eq("training_plan_id", planId)
    .order("scheduled_date", { ascending: true });

  if (!primary.error && Array.isArray(primary.data) && primary.data.length > 0) {
    return normalizeWorkoutRows(primary.data);
  }

  if (primary.error && !shouldFallbackToLegacyPlanId(primary.error)) {
    throw new Error("Could not load workouts.");
  }

  const legacy = await database
    .from(SUPABASE_TABLES.workouts)
    .select("id,scheduled_date,title,workout_type,intensity,status,distance_km,duration_minutes,target_pace,purpose,notes")
    .eq("user_id", userId)
    .eq("plan_id", planId)
    .order("scheduled_date", { ascending: true });

  if (legacy.error) {
    throw new Error("Could not load workouts.");
  }

  return normalizeWorkoutRows(legacy.data);
}

export async function loadActiveAccountPlan(
  session: Session | null,
  database?: AccountPlanDatabase
): Promise<AccountPlanResult> {
  const userId = session?.user.id;
  if (!userId) {
    return { ok: false, message: "Sign in to load your plan." };
  }

  try {
    const activeDatabase = database ?? await loadDefaultDatabase();
    const planResult = await activeDatabase
      .from(SUPABASE_TABLES.trainingPlans)
      .select("id,name,race_date,status,plan_json,updated_at,created_at")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (planResult.error) {
      return { ok: false, message: "Could not load your active plan." };
    }

    const plan = normalizePlanRow(planResult.data);
    if (!plan) {
      return { ok: true, message: "No active training plan found." };
    }

    const workouts = await loadWorkoutRows(activeDatabase, userId, plan.id);

    return {
      ok: true,
      message: "Active plan loaded.",
      plan: {
        ...plan,
        workouts
      }
    };
  } catch {
    return { ok: false, message: "Could not load your active plan." };
  }
}

export function workoutForToday(workouts: AccountPlanWorkout[], today = new Date()): AccountPlanWorkout | undefined {
  const todayKey = today.toISOString().slice(0, 10);
  return workouts.find((workout) => workout.scheduledDate === todayKey)
    ?? workouts.find((workout) => workout.status === "planned");
}

export function plannedDistanceThisWeek(workouts: AccountPlanWorkout[], today = new Date()): number {
  const start = new Date(today);
  start.setDate(today.getDate() - today.getDay());
  const end = new Date(start);
  end.setDate(start.getDate() + 7);

  const distance = workouts.reduce((sum, workout) => {
    const date = new Date(`${workout.scheduledDate}T12:00:00Z`);
    return date >= start && date < end ? sum + (workout.distanceKm ?? 0) : sum;
  }, 0);

  return Math.round(distance * 10) / 10;
}

export function planAdherenceFromWorkouts(workouts: AccountPlanWorkout[]): number {
  const tracked = workouts.filter((workout) => workout.status !== "skipped");
  if (tracked.length === 0) {
    return 0;
  }

  const completed = tracked.filter((workout) => workout.status === "completed").length;
  return Math.round((completed / tracked.length) * 100);
}
