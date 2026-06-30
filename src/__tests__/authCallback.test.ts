import { describe, expect, it } from "vitest";
import { authDestinationForRedirectType, parseAuthCallbackUrl } from "@/auth/callback";

describe("auth callback parsing", () => {
  it("parses PKCE callback codes", () => {
    expect(parseAuthCallbackUrl("pacepilot://auth/callback?code=abc123")).toEqual({
      kind: "pkce",
      code: "abc123",
      redirectType: undefined
    });
  });

  it("routes recovery callbacks to password update", () => {
    expect(parseAuthCallbackUrl("pacepilot://auth/callback?code=abc123&type=recovery")).toEqual({
      kind: "pkce",
      code: "abc123",
      redirectType: "recovery"
    });
    expect(authDestinationForRedirectType("recovery")).toBe("updatePassword");
  });

  it("supports legacy implicit token hash links", () => {
    expect(parseAuthCallbackUrl("pacepilot://auth/callback#access_token=access&refresh_token=refresh&type=magiclink")).toEqual({
      kind: "implicit",
      accessToken: "access",
      refreshToken: "refresh",
      redirectType: "magiclink"
    });
  });

  it("returns a safe error for failed or empty callbacks", () => {
    expect(parseAuthCallbackUrl("pacepilot://auth/callback?error=access_denied").kind).toBe("error");
    expect(parseAuthCallbackUrl("pacepilot://auth/callback").kind).toBe("empty");
  });
});
