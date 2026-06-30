import {
  accountDataControlUnavailableMessage,
  type AccountDataControlState,
  type SupabaseFunctionInvoker,
  type SupabaseFunctionResult
} from "@/privacy/dataControls";

export type ExternalUrlOpener = (url: string) => Promise<void>;

export type StravaConnectionResult = {
  ok: boolean;
  message: string;
  authorizationUrl?: string;
};

const genericStravaConnectFailure = "Could not start Strava connection. Please try again.";

async function invokeSupabaseFunction(functionName: string): Promise<SupabaseFunctionResult> {
  const { supabase } = await import("@/lib/supabase");
  const { data, error } = await supabase.functions.invoke(functionName, { method: "GET" });
  return {
    data,
    error: error ? { message: error.message } : null
  };
}

export function isSafeStravaAuthorizationUrl(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      (url.hostname === "www.strava.com" || url.hostname === "strava.com") &&
      url.pathname.startsWith("/oauth/");
  } catch {
    return false;
  }
}

function extractAuthorizationUrl(data: unknown): string | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const authorizationUrl = (data as { authorizationUrl?: unknown }).authorizationUrl;
  return isSafeStravaAuthorizationUrl(authorizationUrl) ? authorizationUrl : null;
}

export async function startStravaConnection(
  state: AccountDataControlState,
  openExternalUrl: ExternalUrlOpener,
  invoker: SupabaseFunctionInvoker = invokeSupabaseFunction
): Promise<StravaConnectionResult> {
  const unavailableMessage = accountDataControlUnavailableMessage(state);
  if (unavailableMessage) {
    return { ok: false, message: unavailableMessage };
  }

  try {
    const { data, error } = await invoker("strava-auth-url", { method: "GET" });
    if (error) {
      return { ok: false, message: genericStravaConnectFailure };
    }

    const authorizationUrl = extractAuthorizationUrl(data);
    if (!authorizationUrl) {
      return { ok: false, message: genericStravaConnectFailure };
    }

    await openExternalUrl(authorizationUrl);

    return {
      ok: true,
      message: "Opening Strava to complete the secure connection.",
      authorizationUrl
    };
  } catch {
    return { ok: false, message: genericStravaConnectFailure };
  }
}
