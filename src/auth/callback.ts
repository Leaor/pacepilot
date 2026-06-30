export type AuthCallbackDestination = "app" | "updatePassword";

export type AuthCallbackCompletion =
  | { ok: true; destination: AuthCallbackDestination }
  | { ok: false; message: string };

export type ParsedAuthCallback =
  | { kind: "pkce"; code: string; redirectType?: string }
  | { kind: "implicit"; accessToken: string; refreshToken: string; redirectType?: string }
  | { kind: "error"; message: string }
  | { kind: "empty"; message: string };

export const authCallbackFailureMessage =
  "The secure sign-in link could not be completed. Request a new link and try again.";

function callbackUrl(url: string): URL | null {
  try {
    return url.includes("://") ? new URL(url) : new URL(url, "pacepilot://auth/callback");
  } catch {
    return null;
  }
}

function readCallbackParams(url: URL): URLSearchParams {
  const params = new URLSearchParams(url.search);
  const hash = url.hash.replace(/^#/, "");
  const hashParams = new URLSearchParams(hash);

  for (const [key, value] of hashParams) {
    params.set(key, value);
  }

  return params;
}

function clean(value: string | null): string {
  return value?.trim() ?? "";
}

export function parseAuthCallbackUrl(rawUrl: string): ParsedAuthCallback {
  const url = callbackUrl(rawUrl);
  if (!url) {
    return { kind: "empty", message: authCallbackFailureMessage };
  }

  const params = readCallbackParams(url);
  const error = clean(params.get("error") ?? params.get("error_code"));
  if (error) {
    return { kind: "error", message: authCallbackFailureMessage };
  }

  const redirectType = clean(params.get("type")) || undefined;
  const code = clean(params.get("code"));
  if (code) {
    return { kind: "pkce", code, redirectType };
  }

  const accessToken = clean(params.get("access_token"));
  const refreshToken = clean(params.get("refresh_token"));
  if (accessToken && refreshToken) {
    return { kind: "implicit", accessToken, refreshToken, redirectType };
  }

  return { kind: "empty", message: authCallbackFailureMessage };
}

export function authDestinationForRedirectType(redirectType?: string | null): AuthCallbackDestination {
  return redirectType === "recovery" ? "updatePassword" : "app";
}
