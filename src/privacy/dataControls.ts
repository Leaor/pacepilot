export type AccountDataControlState = {
  configured: boolean;
  loading?: boolean;
  hasSession: boolean;
};

export type SupabaseFunctionOptions = {
  method?: "GET" | "POST";
  body?: Record<string, unknown>;
};

export type SupabaseFunctionResult = {
  data: unknown;
  error: { message?: string } | null;
};

export type SupabaseFunctionInvoker = (
  functionName: string,
  options?: SupabaseFunctionOptions
) => Promise<SupabaseFunctionResult>;

export type PrivacyActionResult = {
  ok: boolean;
  message: string;
  data?: unknown;
};

const genericExportFailure = "Could not generate your export. Please try again.";
const genericDeletionFailure = "Could not record the deletion request. Please try again.";
const genericStravaDisconnectFailure = "Could not disconnect Strava. Please try again.";

export function accountDataControlUnavailableMessage(state: AccountDataControlState): string | null {
  if (state.loading) {
    return "Checking your account session.";
  }

  if (!state.configured) {
    return "Account data controls need Supabase configuration before they can run.";
  }

  if (!state.hasSession) {
    return "Sign in to use account data controls.";
  }

  return null;
}

function countExportCategories(data: unknown): number {
  if (!data || typeof data !== "object") {
    return 0;
  }

  const exportedData = (data as { data?: unknown }).data;
  if (!exportedData || typeof exportedData !== "object" || Array.isArray(exportedData)) {
    return 0;
  }

  return Object.keys(exportedData).length;
}

export function summarizeExportResponse(data: unknown): string {
  const categoryCount = countExportCategories(data);
  if (categoryCount === 0) {
    return "Data export generated for your signed-in account.";
  }

  const plural = categoryCount === 1 ? "category" : "categories";
  return `Data export generated with ${categoryCount} ${plural}.`;
}

export function summarizeStravaDisconnectResponse(data: unknown): string {
  const cacheCleared =
    Boolean(data && typeof data === "object" && (data as { cacheCleared?: unknown }).cacheCleared === true);

  return cacheCleared
    ? "Strava disconnected and cached Strava data was cleared."
    : "Strava disconnected for your account.";
}

async function invokeSupabaseFunction(
  functionName: string,
  options?: SupabaseFunctionOptions
): Promise<SupabaseFunctionResult> {
  const { supabase } = await import("@/lib/supabase");
  const { data, error } = await supabase.functions.invoke(functionName, options);
  return {
    data,
    error: error ? { message: error.message } : null
  };
}

async function invokeAccountDataControl(
  state: AccountDataControlState,
  functionName: string,
  options: SupabaseFunctionOptions,
  failureMessage: string,
  successMessageForData: (data: unknown) => string,
  invoker: SupabaseFunctionInvoker = invokeSupabaseFunction
): Promise<PrivacyActionResult> {
  const unavailableMessage = accountDataControlUnavailableMessage(state);
  if (unavailableMessage) {
    return { ok: false, message: unavailableMessage };
  }

  try {
    const { data, error } = await invoker(functionName, options);
    if (error) {
      return { ok: false, message: failureMessage };
    }

    return {
      ok: true,
      message: successMessageForData(data),
      data
    };
  } catch {
    return { ok: false, message: failureMessage };
  }
}

export function requestFullDataExport(
  state: AccountDataControlState,
  invoker?: SupabaseFunctionInvoker
): Promise<PrivacyActionResult> {
  return invokeAccountDataControl(
    state,
    "export-user-data",
    { method: "POST" },
    genericExportFailure,
    summarizeExportResponse,
    invoker
  );
}

export function requestAccountDeletion(
  state: AccountDataControlState,
  invoker?: SupabaseFunctionInvoker
): Promise<PrivacyActionResult> {
  return invokeAccountDataControl(
    state,
    "delete-account-request",
    { method: "POST" },
    genericDeletionFailure,
    () => "Account deletion request recorded. PacePilot will process deletion against PacePilot-owned data.",
    invoker
  );
}

export function disconnectStrava(
  state: AccountDataControlState,
  clearCache: boolean,
  invoker?: SupabaseFunctionInvoker
): Promise<PrivacyActionResult> {
  return invokeAccountDataControl(
    state,
    "strava-disconnect",
    {
      method: "POST",
      body: {
        clearCache,
        revoke: true
      }
    },
    genericStravaDisconnectFailure,
    summarizeStravaDisconnectResponse,
    invoker
  );
}
