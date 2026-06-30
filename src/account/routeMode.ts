export type AppRouteModeState = {
  configured: boolean;
  hasSession: boolean;
};

export type AppRouteMode = "account" | "sample";

export function getAppRouteMode(state: AppRouteModeState): AppRouteMode {
  return !state.configured && !state.hasSession ? "sample" : "account";
}

export function isSampleAppRoute(state: AppRouteModeState): boolean {
  return getAppRouteMode(state) === "sample";
}

export function displayNameFromEmail(email: string | null | undefined): string {
  const normalized = email?.trim().toLowerCase() ?? "";
  const localPart = normalized.split("@")[0]?.trim() ?? "";

  if (!localPart) {
    return "Runner";
  }

  return localPart
    .replace(/[._-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "Runner";
}
