import type { Session } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import {
  saveAccountSetup,
  trainingPlanRowForSetup,
  workoutRowsForSetup,
  type AccountSetupDatabase,
  type OnboardingSetupInput
} from "@/onboarding/accountSetup";
import { generateTrainingPlan } from "@/lib/training/planGenerator";

const setupInput: OnboardingSetupInput = {
  goalDistance: "half",
  currentWeeklyMileageKm: 25,
  trainingDaysPerWeek: 4,
  experienceLevel: "casual",
  preferredLongRunDay: "Sunday",
  strengthPreference: "bodyweight",
  injuryCaution: false,
  raceDate: "2026-10-18",
  timezone: "America/Toronto",
  units: "km"
};

const session = {
  user: {
    id: "user-1",
    email: "Runner.Setup@example.com"
  }
} as Session;

type DbCall = {
  table: string;
  method: "upsert" | "update" | "insert";
  row: unknown;
  filters: Array<{ column: string; value: unknown }>;
};

function awaitableResult(result: unknown, filters: DbCall["filters"] = []) {
  const builder = {
    filters,
    eq(column: string, value: unknown) {
      filters.push({ column, value });
      return builder;
    },
    select() {
      return builder;
    },
    async single() {
      return result;
    },
    then(resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) {
      return Promise.resolve(result).then(resolve, reject);
    }
  };

  return builder;
}

function createDatabase(planId = "plan-1") {
  const calls: DbCall[] = [];
  const database: AccountSetupDatabase = {
    from(table: string) {
      return {
        upsert(row: unknown) {
          calls.push({ table, method: "upsert", row, filters: [] });
          return Promise.resolve({ data: null, error: null });
        },
        update(row: unknown) {
          const call: DbCall = { table, method: "update", row, filters: [] };
          calls.push(call);
          return awaitableResult({ data: null, error: null }, call.filters);
        },
        insert(row: unknown) {
          calls.push({ table, method: "insert", row, filters: [] });
          return awaitableResult({ data: { id: planId }, error: null });
        }
      };
    }
  };

  return { calls, database };
}

describe("account onboarding setup", () => {
  it("does not persist setup without a signed-in session", async () => {
    const { calls, database } = createDatabase();

    const result = await saveAccountSetup(null, setupInput, database);

    expect(result).toEqual({
      ok: false,
      message: "Sign in before creating an account plan."
    });
    expect(calls).toHaveLength(0);
  });

  it("saves profile, archives active plans, creates a plan, and writes workouts for the signed-in user", async () => {
    const { calls, database } = createDatabase();

    const result = await saveAccountSetup(session, setupInput, database);

    expect(result.ok).toBe(true);
    expect(calls.map((call) => [call.table, call.method])).toEqual([
      ["profiles", "upsert"],
      ["training_plans", "update"],
      ["training_plans", "insert"],
      ["workouts", "insert"]
    ]);

    expect(calls[0].row).toMatchObject({
      id: "user-1",
      email: "Runner.Setup@example.com",
      display_name: "Runner Setup",
      current_weekly_mileage: 25,
      race_date: "2026-10-18"
    });
    expect(calls[1]).toMatchObject({
      row: { status: "archived" },
      filters: [
        { column: "user_id", value: "user-1" },
        { column: "status", value: "active" }
      ]
    });
    expect(calls[2].row).toMatchObject({
      user_id: "user-1",
      status: "active",
      race_date: "2026-10-18"
    });

    const workoutRows = calls[3].row as Array<Record<string, unknown>>;
    expect(workoutRows.length).toBeGreaterThan(0);
    expect(workoutRows.every((row) => row.user_id === "user-1")).toBe(true);
    expect(workoutRows.every((row) => row.plan_id === "plan-1" && row.training_plan_id === "plan-1")).toBe(true);
  });

  it("builds plan rows with a generated snapshot and compatible goal payload", () => {
    const plan = generateTrainingPlan({
      goalDistance: setupInput.goalDistance,
      raceDate: setupInput.raceDate,
      currentWeeklyMileageKm: setupInput.currentWeeklyMileageKm,
      trainingDaysPerWeek: setupInput.trainingDaysPerWeek,
      experienceLevel: setupInput.experienceLevel,
      preferredLongRunDay: setupInput.preferredLongRunDay,
      strengthPreference: setupInput.strengthPreference,
      startDate: "2026-06-30"
    });

    const planRow = trainingPlanRowForSetup("user-1", setupInput, plan);
    const workoutRows = workoutRowsForSetup("user-1", "plan-1", plan.weeks[0].workouts);

    expect(planRow.goal).toEqual({ distance: "half", raceDate: "2026-10-18" });
    expect(planRow.plan_json).toMatchObject({
      source: "web_onboarding",
      input: setupInput,
      plan: { title: plan.title }
    });
    expect(workoutRows[0]).toMatchObject({
      user_id: "user-1",
      plan_id: "plan-1",
      training_plan_id: "plan-1",
      status: "planned"
    });
  });
});
