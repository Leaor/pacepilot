import type { PlanWorkout } from "@/lib/training/planGenerator";
import { hardWorkoutTypes } from "@/lib/training/workoutTypes";

export type CalendarIssue = {
  severity: "info" | "warning";
  message: string;
  workoutIds: string[];
};

function isHard(workout: PlanWorkout): boolean {
  return workout.intensity === "hard" || hardWorkoutTypes.includes(workout.type);
}

function diffDays(a: string, b: string): number {
  return Math.round((new Date(`${b}T12:00:00Z`).getTime() - new Date(`${a}T12:00:00Z`).getTime()) / 86400000);
}

export function inspectTrainingCalendar(workouts: PlanWorkout[], previousWeeklyMileageKm?: number): CalendarIssue[] {
  const sorted = [...workouts].sort((a, b) => a.date.localeCompare(b.date));
  const issues: CalendarIssue[] = [];
  const weeklyMileage = sorted.reduce((sum, workout) => sum + (workout.distanceKm ?? 0), 0);

  if (previousWeeklyMileageKm && weeklyMileage > previousWeeklyMileageKm * 1.1) {
    issues.push({
      severity: "warning",
      message: "This week exceeds the 10% mileage progression guardrail.",
      workoutIds: sorted.map((workout) => workout.id)
    });
  }

  for (let index = 1; index < sorted.length; index += 1) {
    const current = sorted[index];
    const previous = sorted[index - 1];
    if (isHard(current) && isHard(previous) && diffDays(previous.date, current.date) <= 1) {
      issues.push({
        severity: "warning",
        message: "Back-to-back hard workouts detected.",
        workoutIds: [previous.id, current.id]
      });
    }
  }

  return issues;
}

export function moveWorkout(workout: PlanWorkout, newDate: string, reason: string): PlanWorkout {
  return {
    ...workout,
    date: newDate,
    notes: `${workout.notes} Moved by PacePilot: ${reason}`
  };
}
