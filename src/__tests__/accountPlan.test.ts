import type { Session } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import {
  loadActiveAccountPlan,
  normalizePlanRow,
  normalizeWorkoutRows,
  planAdherenceFromWorkouts,
  plannedDistanceThisWeek,
  workoutForToday,
  type AccountPlanDatabase
} from "@/account/accountPlan";

const session = {
  user: {
    id: "user-1"
  }
} as Session;

const planRow = {
  id: "plan-1",
  name: "Half Marathon PacePilot plan",
  race_date: "2026-10-18",
  status: "active",
  plan_json: { source: "web_onboarding" }
};

const workouts = [
  {
    id: "workout-2",
    scheduled_date: "2026-07-02",
    title: "Easy run",
    workout_type: "easy",
    intensity: "easy",
    status: "planned",
    distance_km: "7.5",
    target_pace: { range: "6:10-6:45/km" },
    notes: "Keep it comfortable."
  },
  {
    id: "workout-1",
    scheduled_date: "2026-06-30",
    title: "Tempo run",
    workout_type: "tempo",
    intensity: "hard",
    status: "completed",
    distance_km: 8,
    target_pace: { range: "5:00-5:10/km" },
    notes: "Controlled threshold work."
  }
];

function awaitableResult(
  result: unknown | (() => unknown),
  filters: Array<{ column: string; value: unknown }>
) {
  const resolveResult = () => typeof result === "function" ? (result as () => unknown)() : result;
  const builder = {
    eq(column: string, value: unknown) {
      filters.push({ column, value });
      return builder;
    },
    order() {
      return builder;
    },
    limit() {
      return builder;
    },
    async maybeSingle() {
      return resolveResult();
    },
    then(resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) {
      return Promise.resolve(resolveResult()).then(resolve, reject);
    }
  };

  return builder;
}

function createDatabase({
  plan = planRow,
  primaryWorkoutResult = { data: workouts, error: null },
  legacyWorkoutResult = { data: [], error: null }
}: {
  plan?: unknown;
  primaryWorkoutResult?: unknown;
  legacyWorkoutResult?: unknown;
} = {}) {
  const workoutFilters: Array<Array<{ column: string; value: unknown }>> = [];
  const database: AccountPlanDatabase = {
    from(table: string) {
      return {
        select() {
          const filters: Array<{ column: string; value: unknown }> = [];
          const result = table === "training_plans"
            ? { data: plan, error: null }
            : () => filters.some((filter) => filter.column === "plan_id")
                ? legacyWorkoutResult
                : primaryWorkoutResult;

          const builder = awaitableResult(result, filters);

          if (table === "workouts") {
            workoutFilters.push(filters);
          }

          return builder;
        }
      };
    }
  };

  return { database, workoutFilters };
}

describe("account plan loading", () => {
  it("does not query without a signed-in session", async () => {
    const { database, workoutFilters } = createDatabase();

    const result = await loadActiveAccountPlan(null, database);

    expect(result).toEqual({
      ok: false,
      message: "Sign in to load your plan."
    });
    expect(workoutFilters).toHaveLength(0);
  });

  it("loads an active plan and normalizes sorted workouts", async () => {
    const { database } = createDatabase();

    const result = await loadActiveAccountPlan(session, database);

    expect(result.ok).toBe(true);
    expect(result.plan).toMatchObject({
      id: "plan-1",
      name: "Half Marathon PacePilot plan",
      raceDate: "2026-10-18",
      workouts: [
        {
          id: "workout-1",
          scheduledDate: "2026-06-30",
          title: "Tempo run",
          distanceKm: 8,
          targetPace: "5:00-5:10/km"
        },
        {
          id: "workout-2",
          scheduledDate: "2026-07-02",
          title: "Easy run",
          distanceKm: 7.5
        }
      ]
    });
  });

  it("falls back to legacy plan_id workout links when training_plan_id is empty", async () => {
    const { database, workoutFilters } = createDatabase({
      primaryWorkoutResult: { data: [], error: null },
      legacyWorkoutResult: { data: workouts.slice(0, 1), error: null }
    });

    const result = await loadActiveAccountPlan(session, database);

    expect(result.plan?.workouts).toHaveLength(1);
    expect(workoutFilters.at(-1)).toContainEqual({ column: "plan_id", value: "plan-1" });
  });

  it("returns an empty success when no active plan exists", async () => {
    const { database } = createDatabase({ plan: null });

    const result = await loadActiveAccountPlan(session, database);

    expect(result).toEqual({
      ok: true,
      message: "No active training plan found."
    });
  });

  it("normalizes malformed rows safely and computes simple plan metrics", () => {
    expect(normalizePlanRow({ id: "", name: "Missing id" })).toBeNull();
    const normalized = normalizeWorkoutRows([...workouts, { id: "bad" }]);

    expect(normalized).toHaveLength(2);
    expect(workoutForToday(normalized, new Date("2026-06-30T12:00:00Z"))?.id).toBe("workout-1");
    expect(plannedDistanceThisWeek(normalized, new Date("2026-06-30T12:00:00Z"))).toBe(15.5);
    expect(planAdherenceFromWorkouts(normalized)).toBe(50);
  });
});
