import { describe, expect, it } from "vitest";
import { displayNameFromEmail, getAppRouteMode, isSampleAppRoute } from "@/account/routeMode";

describe("account route mode", () => {
  it("uses sample mode only for unconfigured local previews without a session", () => {
    expect(getAppRouteMode({ configured: false, hasSession: false })).toBe("sample");
    expect(isSampleAppRoute({ configured: false, hasSession: false })).toBe(true);
  });

  it("uses account mode for configured or authenticated routes", () => {
    expect(getAppRouteMode({ configured: true, hasSession: false })).toBe("account");
    expect(getAppRouteMode({ configured: true, hasSession: true })).toBe("account");
    expect(getAppRouteMode({ configured: false, hasSession: true })).toBe("account");
  });

  it("derives a readable display name without leaking the full email local format", () => {
    expect(displayNameFromEmail(" runner.dev-user@example.com ")).toBe("Runner Dev User");
    expect(displayNameFromEmail("")).toBe("Runner");
    expect(displayNameFromEmail(undefined)).toBe("Runner");
  });
});
