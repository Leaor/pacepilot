export type PaceInputSource =
  | "pacepilot_manual"
  | "pacepilot_gps"
  | "user_provided_import"
  | "garmin_import"
  | "apple_health_import";

export type RecentRaceResult = {
  distanceKm: number;
  timeSeconds: number;
  source: PaceInputSource;
};

export type PaceRange = {
  minSecondsPerKm: number;
  maxSecondsPerKm: number;
};

export type PaceZones = {
  racePace: number;
  recovery: PaceRange;
  easy: PaceRange;
  longRun: PaceRange;
  tempo: PaceRange;
  interval: PaceRange;
};

export type PaceEngineInput = {
  goalDistanceKm?: number;
  goalTimeSeconds?: number;
  recentRaceResult?: RecentRaceResult;
};

function clampPace(secondsPerKm: number): number {
  return Math.max(150, Math.min(720, Math.round(secondsPerKm)));
}

function rangeAround(base: number, fasterOffset: number, slowerOffset: number): PaceRange {
  return {
    minSecondsPerKm: clampPace(base + fasterOffset),
    maxSecondsPerKm: clampPace(base + slowerOffset)
  };
}

function estimateEquivalentPace(result: RecentRaceResult, targetDistanceKm: number): number {
  const equivalentSeconds = result.timeSeconds * Math.pow(targetDistanceKm / result.distanceKm, 1.06);
  return equivalentSeconds / targetDistanceKm;
}

export function calculatePaceZones(input: PaceEngineInput): PaceZones {
  const fallbackRacePace = 330;
  const targetDistanceKm = input.goalDistanceKm ?? input.recentRaceResult?.distanceKm ?? 10;
  const racePace = input.goalTimeSeconds
    ? input.goalTimeSeconds / targetDistanceKm
    : input.recentRaceResult
      ? estimateEquivalentPace(input.recentRaceResult, targetDistanceKm)
      : fallbackRacePace;

  const base = clampPace(racePace);

  return {
    racePace: base,
    recovery: rangeAround(base, 95, 155),
    easy: rangeAround(base, 70, 125),
    longRun: rangeAround(base, 60, 110),
    tempo: rangeAround(base, 8, 28),
    interval: rangeAround(base, -28, -8)
  };
}

export function formatPace(secondsPerKm: number): string {
  const rounded = clampPace(secondsPerKm);
  const minutes = Math.floor(rounded / 60);
  const seconds = String(rounded % 60).padStart(2, "0");
  return `${minutes}:${seconds}/km`;
}

export function formatPaceRange(range: PaceRange): string {
  return `${formatPace(range.minSecondsPerKm)}-${formatPace(range.maxSecondsPerKm)}`;
}
