import { describe, expect, it } from "vitest";
import { demoCheckIn, demoWorkouts } from "@/data/demo";
import {
  adaptAfterMissedWorkout,
  calculatePlanConfidence,
  enforceTrainingSafety,
  raceOutcomeToCoachMemory,
  recommendWorkoutReadiness
} from "@/training/planEngine";

describe("plan engine", () => {
  it("scores plan confidence from adherence, load, readiness, and long-run progression", () => {
    const confidence = calculatePlanConfidence({
      currentWeeklyMileageKm: 33,
      previousWeeklyMileageKm: 31,
      missedWorkoutsLast14Days: 0,
      completedWorkoutsLast14Days: 8,
      longRunKm: 16,
      targetRaceDistanceKm: 21.1,
      hardWorkoutsThisWeek: 1,
      easyWorkoutsThisWeek: 3,
      latestCheckIn: demoCheckIn
    });

    expect(confidence.level).toBe("high");
    expect(confidence.signals).toContain("Strong recent adherence");
  });

  it("blocks unsafe mileage jumps and hard workouts after high fatigue", () => {
    const safety = enforceTrainingSafety({
      previousWeeklyMileageKm: 30,
      proposedWeeklyMileageKm: 40,
      hardWorkoutsPrevious48Hours: 1,
      latestCheckIn: {
        ...demoCheckIn,
        fatigue: 5
      }
    });

    expect(safety.allowed).toBe(false);
    expect(safety.adjustedWeeklyMileageKm).toBe(33);
    expect(safety.blockedReasons).toContain("High fatigue blocks hard training escalation");
  });

  it("recommends swapping hard workouts to easy when readiness is low", () => {
    const recommendation = recommendWorkoutReadiness(
      {
        ...demoCheckIn,
        fatigue: 4,
        sleepHours: 5.8
      },
      demoWorkouts[0]
    );

    expect(recommendation.action).toBe("swap_easy");
  });

  it("does not stack a missed hard workout onto the next session", () => {
    const adaptation = adaptAfterMissedWorkout(
      {
        ...demoWorkouts[0],
        status: "missed"
      },
      demoWorkouts[1]
    );

    expect(adaptation.changedWorkout.type).toBe("easy");
    expect(adaptation.explanation).toContain("not stacked");
  });

  it("turns race outcomes into editable coach memory", () => {
    const memory = raceOutcomeToCoachMemory("terrain_mismatch");

    expect(memory.userEditable).toBe(true);
    expect(memory.value.toLowerCase()).toContain("terrain");
  });
});
