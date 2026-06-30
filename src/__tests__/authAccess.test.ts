import { describe, expect, it } from "vitest";
import { canAccessAppRoutes, shouldHoldAppRoutes, shouldRedirectToSignIn } from "@/auth/access";

describe("auth route access", () => {
  it("allows local sample routes when Supabase is not configured", () => {
    const state = { configured: false, loading: false, hasSession: false };

    expect(canAccessAppRoutes(state)).toBe(true);
    expect(shouldRedirectToSignIn(state)).toBe(false);
  });

  it("holds protected routes while a configured session is loading", () => {
    const state = { configured: true, loading: true, hasSession: false };

    expect(canAccessAppRoutes(state)).toBe(false);
    expect(shouldHoldAppRoutes(state)).toBe(true);
    expect(shouldRedirectToSignIn(state)).toBe(false);
  });

  it("redirects configured builds without a session", () => {
    const state = { configured: true, loading: false, hasSession: false };

    expect(canAccessAppRoutes(state)).toBe(false);
    expect(shouldRedirectToSignIn(state)).toBe(true);
  });

  it("allows configured builds with a session", () => {
    const state = { configured: true, loading: false, hasSession: true };

    expect(canAccessAppRoutes(state)).toBe(true);
    expect(shouldHoldAppRoutes(state)).toBe(false);
    expect(shouldRedirectToSignIn(state)).toBe(false);
  });
});
