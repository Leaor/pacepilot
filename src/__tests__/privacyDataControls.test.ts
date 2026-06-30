import { describe, expect, it } from "vitest";
import {
  accountDataControlUnavailableMessage,
  disconnectStrava,
  requestAccountDeletion,
  requestFullDataExport,
  summarizeExportResponse,
  type AccountDataControlState,
  type SupabaseFunctionInvoker,
  type SupabaseFunctionOptions
} from "@/privacy/dataControls";

const signedInState: AccountDataControlState = {
  configured: true,
  loading: false,
  hasSession: true
};

function createInvoker(data: unknown, error: { message?: string } | null = null) {
  const calls: Array<{ functionName: string; options?: SupabaseFunctionOptions }> = [];
  const invoker: SupabaseFunctionInvoker = async (functionName, options) => {
    calls.push({ functionName, options });
    return { data, error };
  };

  return { calls, invoker };
}

describe("privacy data controls", () => {
  it("pauses account controls while the session is loading", () => {
    expect(accountDataControlUnavailableMessage({ configured: true, loading: true, hasSession: false }))
      .toBe("Checking your account session.");
  });

  it("does not call account functions in local preview mode", async () => {
    const { calls, invoker } = createInvoker({});

    const result = await requestFullDataExport({ configured: false, loading: false, hasSession: false }, invoker);

    expect(result).toEqual({
      ok: false,
      message: "Account data controls need Supabase configuration before they can run."
    });
    expect(calls).toHaveLength(0);
  });

  it("requires a signed-in session before invoking account functions", async () => {
    const { calls, invoker } = createInvoker({});

    const result = await requestAccountDeletion({ configured: true, loading: false, hasSession: false }, invoker);

    expect(result).toEqual({
      ok: false,
      message: "Sign in to use account data controls."
    });
    expect(calls).toHaveLength(0);
  });

  it("requests a full data export through the authenticated Edge Function", async () => {
    const { calls, invoker } = createInvoker({
      data: {
        profiles: [],
        workouts: [],
        ai_chat_messages: []
      }
    });

    const result = await requestFullDataExport(signedInState, invoker);

    expect(calls).toEqual([
      {
        functionName: "export-user-data",
        options: { method: "POST" }
      }
    ]);
    expect(result.ok).toBe(true);
    expect(result.message).toBe("Data export generated with 3 categories.");
  });

  it("records account deletion requests through the supported backend contract", async () => {
    const { calls, invoker } = createInvoker({ request: { id: "request-1" } });

    const result = await requestAccountDeletion(signedInState, invoker);

    expect(calls).toEqual([
      {
        functionName: "delete-account-request",
        options: { method: "POST" }
      }
    ]);
    expect(result.ok).toBe(true);
    expect(result.message).toContain("Account deletion request recorded.");
  });

  it("disconnects Strava with explicit cache-clearing intent", async () => {
    const { calls, invoker } = createInvoker({ disconnected: true, cacheCleared: true });

    const result = await disconnectStrava(signedInState, true, invoker);

    expect(calls).toEqual([
      {
        functionName: "strava-disconnect",
        options: {
          method: "POST",
          body: {
            clearCache: true,
            revoke: true
          }
        }
      }
    ]);
    expect(result).toEqual({
      ok: true,
      message: "Strava disconnected and cached Strava data was cleared.",
      data: { disconnected: true, cacheCleared: true }
    });
  });

  it("returns generic errors without exposing backend details", async () => {
    const { invoker } = createInvoker(null, { message: "service role table name leaked" });

    const result = await requestFullDataExport(signedInState, invoker);

    expect(result).toEqual({
      ok: false,
      message: "Could not generate your export. Please try again."
    });
  });

  it("summarizes empty export responses safely", () => {
    expect(summarizeExportResponse(null)).toBe("Data export generated for your signed-in account.");
  });
});
