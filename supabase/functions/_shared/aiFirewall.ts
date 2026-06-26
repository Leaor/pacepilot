const blockedSources = new Set([
  "strava_cache",
  "strava_api",
  "strava_segments",
  "strava_leaderboards",
  "deleted_user_data",
  "opted_out"
]);

export type AiFirewallResult = {
  usedSources: string[];
  excludedSources: string[];
};

export function applyAiDataFirewall(requestedSources: string[]): AiFirewallResult {
  const usedSources: string[] = [];
  const excludedSources: string[] = [];

  for (const source of requestedSources) {
    const normalized = source.trim().toLowerCase();
    if (!normalized || blockedSources.has(normalized) || normalized.includes("strava")) {
      excludedSources.push(source || "unknown");
    } else {
      usedSources.push(source);
    }
  }

  if (!excludedSources.includes("strava_cache")) {
    excludedSources.push("strava_cache");
  }

  return { usedSources, excludedSources };
}
