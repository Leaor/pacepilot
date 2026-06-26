export type LifeModeOption =
  | "missed_workout"
  | "missed_multiple_days"
  | "only_20_minutes"
  | "tired"
  | "sick"
  | "legs_sore"
  | "traveling"
  | "busy_week"
  | "easier_week"
  | "race_weekend"
  | "move_long_run"
  | "returning_from_break";

export type LifeModeResult = {
  option: LifeModeOption;
  suggestedAction: "skip" | "move" | "reduce" | "swap_easy" | "rest" | "rebuild_week";
  title: string;
  explanation: string;
};

const lifeModeResults: Record<LifeModeOption, LifeModeResult> = {
  missed_workout: {
    option: "missed_workout",
    suggestedAction: "skip",
    title: "Skip, do not cram",
    explanation: "One missed workout is usually safest to leave behind unless it is a key long run."
  },
  missed_multiple_days: {
    option: "missed_multiple_days",
    suggestedAction: "rebuild_week",
    title: "Rebuild the week",
    explanation: "Multiple missed days change the load pattern, so PacePilot rebuilds around the next safe anchor."
  },
  only_20_minutes: {
    option: "only_20_minutes",
    suggestedAction: "reduce",
    title: "Twenty-minute maintenance",
    explanation: "Short easy running preserves routine without pretending it replaces the full workout."
  },
  tired: {
    option: "tired",
    suggestedAction: "swap_easy",
    title: "Make it easy",
    explanation: "Fatigue lowers intensity first, then volume if needed."
  },
  sick: {
    option: "sick",
    suggestedAction: "rest",
    title: "Rest today",
    explanation: "Illness is a clear reason to pause training and restart gently."
  },
  legs_sore: {
    option: "legs_sore",
    suggestedAction: "swap_easy",
    title: "Easy or mobility",
    explanation: "Soreness gets mobility or easy effort, not a stacked hard session."
  },
  traveling: {
    option: "traveling",
    suggestedAction: "reduce",
    title: "Travel-light week",
    explanation: "Keep the habit with shorter sessions and no fragile workout timing."
  },
  busy_week: {
    option: "busy_week",
    suggestedAction: "rebuild_week",
    title: "Compact safely",
    explanation: "Protect easy-hard spacing and keep the long run only if the week can absorb it."
  },
  easier_week: {
    option: "easier_week",
    suggestedAction: "reduce",
    title: "Deload",
    explanation: "Reduce load and preserve confidence instead of forcing a brittle plan."
  },
  race_weekend: {
    option: "race_weekend",
    suggestedAction: "rebuild_week",
    title: "Race mini-taper",
    explanation: "Shift hard work away and let the race be the quality effort."
  },
  move_long_run: {
    option: "move_long_run",
    suggestedAction: "move",
    title: "Move the long run",
    explanation: "Move the long run with at least one easy or rest day around it."
  },
  returning_from_break: {
    option: "returning_from_break",
    suggestedAction: "rebuild_week",
    title: "Restart gently",
    explanation: "Return with reduced volume, easy effort, and more readiness checks."
  }
};

export function applyLifeMode(option: LifeModeOption): LifeModeResult {
  return lifeModeResults[option];
}
