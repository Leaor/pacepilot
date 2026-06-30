import type { Session } from "@supabase/supabase-js";
import { SUPABASE_TABLES } from "@/lib/supabaseTables";
import type { Activity } from "@/lib/types";

export type ManualActivityInput = {
  distanceKm: number;
  durationMinutes: number;
  perceivedEffort: number;
  fatigueAfter: number;
  notes?: string;
};

export type AccountActivitiesResult = {
  ok: boolean;
  message: string;
  activities: Activity[];
};

export type SaveManualActivityResult = {
  ok: boolean;
  message: string;
  activity?: Activity;
};

export type AccountActivitiesDatabase = {
  from: (table: string) => any;
};

export const manualActivityPresets: Array<{ label: string; input: ManualActivityInput }> = [
  {
    label: "Easy 5K",
    input: {
      distanceKm: 5,
      durationMinutes: 32,
      perceivedEffort: 3,
      fatigueAfter: 2,
      notes: "Easy conversational run."
    }
  },
  {
    label: "Steady 8K",
    input: {
      distanceKm: 8,
      durationMinutes: 46,
      perceivedEffort: 5,
      fatigueAfter: 3,
      notes: "Steady aerobic run."
    }
  },
  {
    label: "Long 12K",
    input: {
      distanceKm: 12,
      durationMinutes: 78,
      perceivedEffort: 4,
      fatigueAfter: 3,
      notes: "Long run logged manually."
    }
  }
];

async function loadDefaultDatabase(): Promise<AccountActivitiesDatabase> {
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

function validBoundedInteger(value: number, min: number, max: number): boolean {
  return Number.isInteger(value) && value >= min && value <= max;
}

export function validateManualActivity(input: ManualActivityInput): string | null {
  if (!Number.isFinite(input.distanceKm) || input.distanceKm <= 0 || input.distanceKm > 200) {
    return "Enter a realistic distance before saving.";
  }

  if (!Number.isFinite(input.durationMinutes) || input.durationMinutes <= 0 || input.durationMinutes > 1440) {
    return "Enter a realistic duration before saving.";
  }

  if (!validBoundedInteger(input.perceivedEffort, 1, 10)) {
    return "Choose an effort from 1 to 10.";
  }

  if (!validBoundedInteger(input.fatigueAfter, 1, 5)) {
    return "Choose fatigue from 1 to 5.";
  }

  return null;
}

export function manualActivityRowForInsert(userId: string, input: ManualActivityInput, startedAt = new Date()): Record<string, unknown> {
  const durationSeconds = Math.round(input.durationMinutes * 60);
  const averagePaceSecondsPerKm = Math.round(durationSeconds / input.distanceKm);

  return {
    user_id: userId,
    source: "pacepilot_manual",
    started_at: startedAt.toISOString(),
    distance_km: Math.round(input.distanceKm * 10) / 10,
    duration_seconds: durationSeconds,
    average_pace_seconds_per_km: averagePaceSecondsPerKm,
    perceived_effort: input.perceivedEffort,
    fatigue_after: input.fatigueAfter,
    notes: input.notes?.trim() || null
  };
}

export function normalizeActivityRow(row: unknown): Activity | null {
  if (!row || typeof row !== "object") {
    return null;
  }

  const record = row as Record<string, unknown>;
  const id = asString(record.id);
  const source = asString(record.source);
  const startedAt = asString(record.started_at);
  const distanceKm = asNumber(record.distance_km);
  const durationSeconds = asNumber(record.duration_seconds);

  if (!id || !source || !startedAt || typeof distanceKm !== "number" || typeof durationSeconds !== "number") {
    return null;
  }

  return {
    id,
    source: source as Activity["source"],
    startedAt,
    title: source === "pacepilot_manual" ? "Manual run" : undefined,
    distanceKm,
    durationSeconds,
    averagePaceSecondsPerKm: asNumber(record.average_pace_seconds_per_km),
    elevationGainMeters: asNumber(record.elevation_meters),
    avgHeartRate: asNumber(record.heart_rate_average),
    perceivedEffort: asNumber(record.perceived_effort),
    fatigueAfter: asNumber(record.fatigue_after),
    notes: asString(record.notes)
  };
}

export function normalizeActivityRows(rows: unknown): Activity[] {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows
    .map(normalizeActivityRow)
    .filter((activity): activity is Activity => Boolean(activity))
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

export async function loadAccountActivities(
  session: Session | null,
  database?: AccountActivitiesDatabase
): Promise<AccountActivitiesResult> {
  const userId = session?.user.id;
  if (!userId) {
    return { ok: false, message: "Sign in to load activities.", activities: [] };
  }

  try {
    const activeDatabase = database ?? await loadDefaultDatabase();
    const result = await activeDatabase
      .from(SUPABASE_TABLES.activities)
      .select("id,source,started_at,distance_km,duration_seconds,elevation_meters,average_pace_seconds_per_km,heart_rate_average,perceived_effort,fatigue_after,notes")
      .eq("user_id", userId)
      .order("started_at", { ascending: false })
      .limit(100);

    if (result.error) {
      return { ok: false, message: "Could not load activities.", activities: [] };
    }

    return {
      ok: true,
      message: "Activities loaded.",
      activities: normalizeActivityRows(result.data)
    };
  } catch {
    return { ok: false, message: "Could not load activities.", activities: [] };
  }
}

export async function saveManualActivity(
  session: Session | null,
  input: ManualActivityInput,
  database?: AccountActivitiesDatabase
): Promise<SaveManualActivityResult> {
  const userId = session?.user.id;
  if (!userId) {
    return { ok: false, message: "Sign in before saving an activity." };
  }

  const validationMessage = validateManualActivity(input);
  if (validationMessage) {
    return { ok: false, message: validationMessage };
  }

  try {
    const activeDatabase = database ?? await loadDefaultDatabase();
    const result = await activeDatabase
      .from(SUPABASE_TABLES.activities)
      .insert(manualActivityRowForInsert(userId, input))
      .select("id,source,started_at,distance_km,duration_seconds,elevation_meters,average_pace_seconds_per_km,heart_rate_average,perceived_effort,fatigue_after,notes")
      .single();

    if (result.error) {
      return { ok: false, message: "Could not save the manual activity." };
    }

    const activity = normalizeActivityRow(result.data);
    if (!activity) {
      return { ok: false, message: "Could not save the manual activity." };
    }

    return {
      ok: true,
      message: "Manual activity saved.",
      activity
    };
  } catch {
    return { ok: false, message: "Could not save the manual activity." };
  }
}
