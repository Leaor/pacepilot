import { describe, expect, it } from "vitest";
import { getAuthSessionProfile, hasUsableAuthSession, toUsableAuthSession } from "@/auth/session";

describe("auth sessions", () => {
  it("rejects missing or incomplete sessions", () => {
    expect(hasUsableAuthSession(null)).toBe(false);
    expect(hasUsableAuthSession({ access_token: "", user: { id: "user-1" } } as never)).toBe(false);
    expect(hasUsableAuthSession({ access_token: "token", user: { id: "" } } as never)).toBe(false);
    expect(toUsableAuthSession(undefined)).toBeNull();
  });

  it("accepts sessions with a token and user id", () => {
    const session = { access_token: "token", user: { id: "user-1" } } as never;

    expect(hasUsableAuthSession(session)).toBe(true);
    expect(toUsableAuthSession(session)).toBe(session);
  });

  it("extracts a normalized profile identity from a usable session", () => {
    const session = { access_token: "token", user: { id: "user-1", email: " Runner@Example.COM " } } as never;

    expect(getAuthSessionProfile(session)).toEqual({
      userId: "user-1",
      email: "runner@example.com"
    });
  });

  it("uses fallback email only when the session has no email", () => {
    const session = { access_token: "token", user: { id: "user-1" } } as never;

    expect(getAuthSessionProfile(session, " fallback@example.com ")).toEqual({
      userId: "user-1",
      email: "fallback@example.com"
    });
  });
});
