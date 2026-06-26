export type PacingStyle = "even" | "negative_split" | "conservative_start" | "aggressive_pr";

export type RaceStrategyInput = {
  distanceKm: number;
  goalTimeSeconds: number;
  pacingStyle: PacingStyle;
  units?: "km" | "mi";
};

export type RaceSplit = {
  segment: number;
  targetSeconds: number;
  note: string;
};

export type RaceStrategy = {
  distanceKm: number;
  goalTimeSeconds: number;
  pacingStyle: PacingStyle;
  splits: RaceSplit[];
  warmup: string[];
  fueling: string[];
  backupPlan: string[];
};

function distribute(total: number, weights: number[]): number[] {
  const weightSum = weights.reduce((sum, value) => sum + value, 0);
  let assigned = 0;
  return weights.map((weight, index) => {
    const value = index === weights.length - 1 ? total - assigned : Math.round((total * weight) / weightSum);
    assigned += value;
    return value;
  });
}

function weightsForStyle(count: number, style: PacingStyle): number[] {
  return Array.from({ length: count }, (_value, index) => {
    const progress = count <= 1 ? 0 : index / (count - 1);
    if (style === "negative_split") return 1.04 - progress * 0.08;
    if (style === "conservative_start") return index < 2 ? 1.08 : 0.99;
    if (style === "aggressive_pr") return index < Math.ceil(count * 0.25) ? 0.98 : 1.01;
    return 1;
  });
}

export function buildRaceStrategy(input: RaceStrategyInput): RaceStrategy {
  const splitCount = Math.max(1, Math.round(input.distanceKm));
  const splitSeconds = distribute(input.goalTimeSeconds, weightsForStyle(splitCount, input.pacingStyle));

  return {
    distanceKm: input.distanceKm,
    goalTimeSeconds: input.goalTimeSeconds,
    pacingStyle: input.pacingStyle,
    splits: splitSeconds.map((targetSeconds, index) => ({
      segment: index + 1,
      targetSeconds,
      note: index === 0 ? "Start controlled and settle before checking pace." : "Hold effort and adjust by feel."
    })),
    warmup: ["10-15 min easy jog", "4 relaxed strides", "Arrive at the start calm, not rushed"],
    fueling:
      input.distanceKm >= 21
        ? ["Practice race fuel in long runs", "Take fuel early before energy drops", "Use water with gels when available"]
        : ["Keep breakfast familiar", "Sip fluids before the start"],
    backupPlan: [
      "If effort feels too high early, slow for the next split.",
      "If the second half feels strong, progress gradually.",
      "Do not chase a single bad split."
    ]
  };
}
