export type RaceReadinessInput = {
  planAdherencePercent: number;
  recentLongRunRatio: number;
  weeklyMileageConsistencyPercent: number;
  fatigue: number;
  soreness: number;
  sleepQuality: number;
  missedWorkouts: number;
  paceProgressPercent: number;
  taperStatus: "not_started" | "in_taper" | "race_week";
  daysUntilRace: number;
};

export type RaceReadiness = {
  score: number;
  label: "Needs recovery" | "Building" | "On track" | "Race ready" | "Taper smart";
  explanations: string[];
  recommendedAction: string;
};

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function calculateRaceReadiness(input: RaceReadinessInput): RaceReadiness {
  let score = 40;
  score += input.planAdherencePercent * 0.22;
  score += input.recentLongRunRatio * 18;
  score += input.weeklyMileageConsistencyPercent * 0.18;
  score += input.paceProgressPercent * 0.25;
  score -= Math.max(0, input.fatigue - 2) * 6;
  score -= Math.max(0, input.soreness - 2) * 7;
  score -= Math.max(0, 3 - input.sleepQuality) * 5;
  score -= input.missedWorkouts * 4;

  if (input.taperStatus === "in_taper") score += 4;
  if (input.taperStatus === "race_week") score += input.fatigue <= 3 ? 6 : -4;
  if (input.daysUntilRace <= 7 && input.fatigue >= 4) score -= 8;

  const finalScore = clampScore(score);
  const label: RaceReadiness["label"] =
    finalScore >= 86
      ? "Race ready"
      : finalScore >= 72
        ? input.taperStatus === "race_week"
          ? "Taper smart"
          : "On track"
        : finalScore >= 52
          ? "Building"
          : "Needs recovery";

  const explanations = [
    `Plan adherence contributes ${Math.round(input.planAdherencePercent)}% confidence.`,
    input.recentLongRunRatio >= 0.65 ? "Recent long-run progression supports the race distance." : "Long-run progression needs more runway.",
    input.fatigue >= 4 || input.soreness >= 4 ? "Readiness is limited by fatigue or soreness." : "Fatigue and soreness are not blocking signals."
  ];

  const recommendedAction =
    label === "Needs recovery"
      ? "Reduce intensity and collect another check-in before hard training."
      : label === "Race ready" || label === "Taper smart"
        ? "Keep the taper calm and avoid adding new work."
        : "Continue the plan with conservative progression.";

  return { score: finalScore, label, explanations, recommendedAction };
}
