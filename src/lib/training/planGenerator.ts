import type { WorkoutIntensity, WorkoutType } from "@/lib/types";
import { calculatePaceZones, formatPace, formatPaceRange, type RecentRaceResult } from "@/lib/training/paceEngine";

export type GoalDistance = "5k" | "10k" | "half" | "marathon" | "ultra" | "maintain";
export type ExperienceLevel = "new" | "casual" | "intermediate" | "advanced" | "elite";
export type StrengthPreference = "none" | "bodyweight" | "gym";

export type PlanGeneratorInput = {
  goalDistance: GoalDistance;
  raceDate?: string;
  goalTimeSeconds?: number;
  currentWeeklyMileageKm: number;
  trainingDaysPerWeek: number;
  experienceLevel: ExperienceLevel;
  recentRaceResult?: RecentRaceResult;
  injuryCaution?: boolean;
  strengthPreference?: StrengthPreference;
  preferredLongRunDay?: string;
  startDate?: string;
};

export type PlanWorkout = {
  id: string;
  week: number;
  date: string;
  day: string;
  type: WorkoutType;
  title: string;
  distanceKm?: number;
  durationMinutes?: number;
  intensity: WorkoutIntensity;
  targetPace?: string;
  notes: string;
};

export type TrainingPlanWeek = {
  week: number;
  startDate: string;
  endDate: string;
  mileageKm: number;
  phase: "base" | "build" | "recovery" | "taper" | "race";
  workouts: PlanWorkout[];
};

export type GeneratedTrainingPlan = {
  title: string;
  startDate: string;
  endDate: string;
  weeks: TrainingPlanWeek[];
  disclaimer: string;
};

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const goalDistanceKm: Record<GoalDistance, number> = {
  "5k": 5,
  "10k": 10,
  half: 21.1,
  marathon: 42.2,
  ultra: 50,
  maintain: 10
};

function parseDate(date: string): Date {
  return new Date(`${date}T12:00:00Z`);
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: string, days: number): string {
  const next = parseDate(date);
  next.setUTCDate(next.getUTCDate() + days);
  return toDateString(next);
}

function diffDays(start: string, end: string): number {
  return Math.max(0, Math.round((parseDate(end).getTime() - parseDate(start).getTime()) / 86400000));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function dayIndex(day: string | undefined, fallback: number): number {
  if (!day) {
    return fallback;
  }

  const index = dayNames.findIndex((name) => name.toLowerCase() === day.toLowerCase());
  return index === -1 ? fallback : index;
}

function pickTrainingDays(count: number, preferredLongRunDay?: string): number[] {
  const longDay = dayIndex(preferredLongRunDay, 0);
  const anchors = [2, 4, 6, 1, 3, 5, 0];
  const days = Array.from(new Set([longDay, ...anchors])).slice(0, clamp(count, 2, 7));
  return days.sort((a, b) => a - b);
}

function weekPhase(week: number, totalWeeks: number): TrainingPlanWeek["phase"] {
  if (week === totalWeeks) {
    return "race";
  }

  if (week >= totalWeeks - 1) {
    return "taper";
  }

  if (week % 4 === 0) {
    return "recovery";
  }

  return week <= Math.ceil(totalWeeks * 0.35) ? "base" : "build";
}

function hardWorkoutCount(input: PlanGeneratorInput): number {
  if (input.injuryCaution || input.experienceLevel === "new" || input.trainingDaysPerWeek <= 3) {
    return 1;
  }

  return input.experienceLevel === "advanced" || input.experienceLevel === "elite" ? 2 : 1;
}

function roundKm(value: number): number {
  return Math.round(value * 10) / 10;
}

function buildWorkout(
  input: PlanGeneratorInput,
  week: number,
  day: number,
  type: WorkoutType,
  distanceKm: number,
  intensity: WorkoutIntensity,
  targetPace: string | undefined,
  note: string
): PlanWorkout {
  const date = addDays(input.startDate ?? toDateString(new Date()), (week - 1) * 7 + day);
  const titleByType: Record<WorkoutType, string> = {
    easy: "Easy run",
    recovery: "Recovery run",
    long: "Long run",
    tempo: "Threshold tempo",
    intervals: "Controlled intervals",
    hills: "Hill strength",
    race_pace: "Race-pace rehearsal",
    strides: "Strides",
    tune_up_race: "Tune-up race",
    race: "Race day",
    strength: "Strength",
    mobility: "Mobility",
    rest: "Rest"
  };

  return {
    id: `w${week}-${day}-${type}`,
    week,
    date,
    day: dayNames[day],
    type,
    title: titleByType[type],
    distanceKm: type === "strength" || type === "mobility" || type === "rest" ? undefined : roundKm(distanceKm),
    durationMinutes: type === "strength" || type === "mobility" ? 25 : undefined,
    intensity,
    targetPace,
    notes: note
  };
}

export function generateTrainingPlan(input: PlanGeneratorInput): GeneratedTrainingPlan {
  const startDate = input.startDate ?? toDateString(new Date());
  const daysToRace = input.raceDate ? diffDays(startDate, input.raceDate) : 56;
  const totalWeeks = clamp(Math.ceil(daysToRace / 7), 6, 26);
  const distanceKm = goalDistanceKm[input.goalDistance];
  const zones = calculatePaceZones({
    goalDistanceKm: distanceKm,
    goalTimeSeconds: input.goalTimeSeconds,
    recentRaceResult: input.recentRaceResult
  });
  const trainingDays = pickTrainingDays(input.trainingDaysPerWeek, input.preferredLongRunDay);
  const longRunDay = dayIndex(input.preferredLongRunDay, 0);
  const hardCount = hardWorkoutCount(input);
  const weeks: TrainingPlanWeek[] = [];
  let previousMileage = Math.max(8, input.currentWeeklyMileageKm);

  for (let week = 1; week <= totalWeeks; week += 1) {
    const phase = weekPhase(week, totalWeeks);
    const weekStart = addDays(startDate, (week - 1) * 7);
    const weekEnd = addDays(weekStart, 6);
    const progression = input.injuryCaution ? 1.04 : 1.08;
    const rawMileage =
      phase === "race"
        ? previousMileage * 0.58
        : phase === "taper"
          ? previousMileage * 0.78
          : phase === "recovery"
            ? previousMileage * 0.86
            : previousMileage * progression;
    const mileageKm = roundKm(Math.min(rawMileage, previousMileage * 1.1));
    const longRunKm = phase === "race" ? distanceKm : Math.min(mileageKm * 0.34, distanceKm * 0.72);
    const remainingRunKm = Math.max(0, mileageKm - longRunKm);
    const easyDayCount = Math.max(1, trainingDays.length - hardCount - 1);
    const easyKm = remainingRunKm / Math.max(1, easyDayCount + hardCount);
    const workouts: PlanWorkout[] = [];

    for (const day of trainingDays) {
      if (phase === "race" && day === longRunDay) {
        workouts.push(
          buildWorkout(
            { ...input, startDate },
            week,
            day,
            "race",
            distanceKm,
            "hard",
            formatPace(zones.racePace),
            "Execute the saved race strategy. Training guidance is educational and not medical advice."
          )
        );
      } else if (day === longRunDay) {
        workouts.push(
          buildWorkout(
            { ...input, startDate },
            week,
            day,
            "long",
            longRunKm,
            phase === "taper" || phase === "recovery" ? "easy" : "moderate",
            formatPaceRange(zones.longRun),
            "Keep the long run controlled; durability matters more than forcing pace."
          )
        );
      } else if (hardCount > 0 && workouts.filter((workout) => workout.intensity === "hard").length < hardCount && phase !== "recovery" && phase !== "taper") {
        const workoutType: WorkoutType = workouts.some((workout) => workout.type === "tempo") ? "intervals" : "tempo";
        workouts.push(
          buildWorkout(
            { ...input, startDate },
            week,
            day,
            workoutType,
            Math.max(4, easyKm),
            "hard",
            workoutType === "tempo" ? formatPaceRange(zones.tempo) : formatPaceRange(zones.interval),
            "Run hard parts with control and leave a little margin."
          )
        );
      } else {
        workouts.push(
          buildWorkout(
            { ...input, startDate },
            week,
            day,
            phase === "recovery" ? "recovery" : "easy",
            Math.max(3, easyKm),
            "easy",
            formatPaceRange(phase === "recovery" ? zones.recovery : zones.easy),
            "Easy effort should feel conversational."
          )
        );
      }
    }

    if (input.strengthPreference && input.strengthPreference !== "none") {
      workouts.push(
        buildWorkout(
          { ...input, startDate },
          week,
          3,
          input.injuryCaution ? "mobility" : "strength",
          0,
          "easy",
          undefined,
          "Durability work supports consistent running."
        )
      );
    }

    weeks.push({
      week,
      startDate: weekStart,
      endDate: weekEnd,
      mileageKm,
      phase,
      workouts: workouts.sort((a, b) => dayNames.indexOf(a.day) - dayNames.indexOf(b.day))
    });
    previousMileage = mileageKm;
  }

  return {
    title: `${input.goalDistance.toUpperCase()} PacePilot plan`,
    startDate,
    endDate: weeks.at(-1)?.endDate ?? addDays(startDate, totalWeeks * 7),
    weeks,
    disclaimer: "Training guidance is educational and not medical advice."
  };
}
