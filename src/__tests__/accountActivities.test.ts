import type { Session } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import {
  loadAccountActivities,
  manualActivityRowForInsert,
  normalizeActivityRows,
  saveManualActivity,
  validateManualActivity,
  type AccountActivitiesDatabase
} from "@/account/accountActivities";

const session = {
  user: {
    id: "user-1"
  }
} as Session;

const rows = [
  {
    id: "activity-2",
    source: "pacepilot_manual",
    started_at: "2026-07-01T12:00:00Z",
    distance_km: "5.5",
    duration_seconds: 1980,
    average_pace_seconds_per_km: 360,
    perceived_effort: 3,
    fatigue_after: 2,
    notes: "Easy run"
  },
  {
    id: "activity-1",
    source: "strava_cache",
    started_at: "2026-06-30T12:00:00Z",
    distance_km: 8,
    duration_seconds: 2880,
    average_pace_seconds_per_km: 360
  }
];

function awaitableResult(result: unknown) {
  const builder = {
    eq() {
      return builder;
    },
    order() {
      return builder;
    },
    limit() {
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

function createDatabase({
  loadResult = { data: rows, error: null },
  saveResult = { data: rows[0], error: null }
}: {
  loadResult?: unknown;
  saveResult?: unknown;
} = {}) {
  const inserts: unknown[] = [];
  let selectCount = 0;
  const database: AccountActivitiesDatabase = {
    from() {
      return {
        select() {
          selectCount += 1;
          return awaitableResult(loadResult);
        },
        insert(row: unknown) {
          inserts.push(row);
          return awaitableResult(saveResult);
        }
      };
    }
  };

  return { database, inserts, getSelectCount: () => selectCount };
}

describe("account activities", () => {
  it("does not load or save without a signed-in session", async () => {
    const { database, inserts, getSelectCount } = createDatabase();

    const loadResult = await loadAccountActivities(null, database);
    const saveResult = await saveManualActivity(null, {
      distanceKm: 5,
      durationMinutes: 30,
      perceivedEffort: 3,
      fatigueAfter: 2
    }, database);

    expect(loadResult).toEqual({
      ok: false,
      message: "Sign in to load activities.",
      activities: []
    });
    expect(saveResult).toEqual({
      ok: false,
      message: "Sign in before saving an activity."
    });
    expect(getSelectCount()).toBe(0);
    expect(inserts).toHaveLength(0);
  });

  it("loads and normalizes recent activities", async () => {
    const { database } = createDatabase();

    const result = await loadAccountActivities(session, database);

    expect(result.ok).toBe(true);
    expect(result.activities).toEqual([
      {
        id: "activity-2",
        source: "pacepilot_manual",
        startedAt: "2026-07-01T12:00:00Z",
        title: "Manual run",
        distanceKm: 5.5,
        durationSeconds: 1980,
        averagePaceSecondsPerKm: 360,
        elevationGainMeters: undefined,
        avgHeartRate: undefined,
        perceivedEffort: 3,
        fatigueAfter: 2,
        notes: "Easy run"
      },
      {
        id: "activity-1",
        source: "strava_cache",
        startedAt: "2026-06-30T12:00:00Z",
        title: undefined,
        distanceKm: 8,
        durationSeconds: 2880,
        averagePaceSecondsPerKm: 360,
        elevationGainMeters: undefined,
        avgHeartRate: undefined,
        perceivedEffort: undefined,
        fatigueAfter: undefined,
        notes: undefined
      }
    ]);
    expect(normalizeActivityRows([...rows, { id: "bad" }])).toHaveLength(2);
  });

  it("validates and shapes manual activity inserts", () => {
    expect(validateManualActivity({ distanceKm: 0, durationMinutes: 30, perceivedEffort: 3, fatigueAfter: 2 }))
      .toBe("Enter a realistic distance before saving.");
    expect(validateManualActivity({ distanceKm: 5, durationMinutes: 30, perceivedEffort: 11, fatigueAfter: 2 }))
      .toBe("Choose an effort from 1 to 10.");

    expect(manualActivityRowForInsert(
      "user-1",
      {
        distanceKm: 5.55,
        durationMinutes: 32,
        perceivedEffort: 3,
        fatigueAfter: 2,
        notes: "  Easy run  "
      },
      new Date("2026-06-30T12:00:00Z")
    )).toEqual({
      user_id: "user-1",
      source: "pacepilot_manual",
      started_at: "2026-06-30T12:00:00.000Z",
      distance_km: 5.6,
      duration_seconds: 1920,
      average_pace_seconds_per_km: 346,
      perceived_effort: 3,
      fatigue_after: 2,
      notes: "Easy run"
    });
  });

  it("saves manual activities under the signed-in user", async () => {
    const { database, inserts } = createDatabase();

    const result = await saveManualActivity(session, {
      distanceKm: 5,
      durationMinutes: 32,
      perceivedEffort: 3,
      fatigueAfter: 2,
      notes: "Easy run"
    }, database);

    expect(result.ok).toBe(true);
    expect(result.activity?.id).toBe("activity-2");
    expect(inserts[0]).toMatchObject({
      user_id: "user-1",
      source: "pacepilot_manual",
      distance_km: 5,
      duration_seconds: 1920,
      perceived_effort: 3,
      fatigue_after: 2
    });
  });

  it("keeps database errors generic", async () => {
    const { database } = createDatabase({
      loadResult: { data: null, error: { message: "relation leaked" } },
      saveResult: { data: null, error: { message: "constraint leaked" } }
    });

    expect(await loadAccountActivities(session, database)).toEqual({
      ok: false,
      message: "Could not load activities.",
      activities: []
    });
    expect(await saveManualActivity(session, {
      distanceKm: 5,
      durationMinutes: 32,
      perceivedEffort: 3,
      fatigueAfter: 2
    }, database)).toEqual({
      ok: false,
      message: "Could not save the manual activity."
    });
  });
});
