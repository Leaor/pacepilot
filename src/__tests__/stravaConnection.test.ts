import { describe, expect, it } from "vitest";
import {
  isSafeStravaAuthorizationUrl,
  startStravaConnection,
  type ExternalUrlOpener
} from "@/lib/strava/stravaConnection";
import type { AccountDataControlState, SupabaseFunctionInvoker, SupabaseFunctionOptions } from "@/privacy/dataControls";

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

function createOpener() {
  const opened: string[] = [];
  const opener: ExternalUrlOpener = async (url) => {
    opened.push(url);
  };

  return { opened, opener };
}

describe("Strava connection", () => {
  it("does not request OAuth in local preview mode", async () => {
    const { calls, invoker } = createInvoker({});
    const { opened, opener } = createOpener();

    const result = await startStravaConnection({ configured: false, loading: false, hasSession: false }, opener, invoker);

    expect(result).toEqual({
      ok: false,
      message: "Account data controls need Supabase configuration before they can run."
    });
    expect(calls).toHaveLength(0);
    expect(opened).toHaveLength(0);
  });

  it("requests and opens a safe authenticated Strava authorization URL", async () => {
    const authorizationUrl = "https://www.strava.com/oauth/mobile/authorize?client_id=123&state=signed";
    const { calls, invoker } = createInvoker({ authorizationUrl });
    const { opened, opener } = createOpener();

    const result = await startStravaConnection(signedInState, opener, invoker);

    expect(calls).toEqual([
      {
        functionName: "strava-auth-url",
        options: { method: "GET" }
      }
    ]);
    expect(opened).toEqual([authorizationUrl]);
    expect(result).toEqual({
      ok: true,
      message: "Opening Strava to complete the secure connection.",
      authorizationUrl
    });
  });

  it("rejects non-Strava authorization URLs without opening them", async () => {
    const { invoker } = createInvoker({ authorizationUrl: "https://example.com/oauth/mobile/authorize" });
    const { opened, opener } = createOpener();

    const result = await startStravaConnection(signedInState, opener, invoker);

    expect(result).toEqual({
      ok: false,
      message: "Could not start Strava connection. Please try again."
    });
    expect(opened).toHaveLength(0);
  });

  it("keeps backend errors generic", async () => {
    const { invoker } = createInvoker(null, { message: "missing STRAVA_CLIENT_SECRET" });
    const { opener } = createOpener();

    const result = await startStravaConnection(signedInState, opener, invoker);

    expect(result).toEqual({
      ok: false,
      message: "Could not start Strava connection. Please try again."
    });
  });

  it("keeps external URL opener failures generic", async () => {
    const { invoker } = createInvoker({
      authorizationUrl: "https://www.strava.com/oauth/mobile/authorize?client_id=123&state=signed"
    });

    const result = await startStravaConnection(
      signedInState,
      async () => {
        throw new Error("browser unavailable");
      },
      invoker
    );

    expect(result).toEqual({
      ok: false,
      message: "Could not start Strava connection. Please try again."
    });
  });

  it("validates only expected Strava OAuth URLs", () => {
    expect(isSafeStravaAuthorizationUrl("https://www.strava.com/oauth/mobile/authorize")).toBe(true);
    expect(isSafeStravaAuthorizationUrl("https://strava.com/oauth/authorize")).toBe(true);
    expect(isSafeStravaAuthorizationUrl("http://www.strava.com/oauth/mobile/authorize")).toBe(false);
    expect(isSafeStravaAuthorizationUrl("https://www.strava.com/athlete/settings")).toBe(false);
  });
});
