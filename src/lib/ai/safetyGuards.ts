export function trainingSafetyBoundary(): string {
  return "Training guidance is educational and not medical advice. Do not diagnose injuries or override PacePilot safety rules.";
}

export function blockedStravaAnalysisMessage(): string {
  return "PacePilot can display your Strava activity, but Strava API data cannot be used for AI coaching or run analysis. To analyze this run, record it in PacePilot or upload a user-provided run file with consent.";
}
