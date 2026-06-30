import { describe, expect, it } from "vitest";
import {
  accountServicesUnavailableMessage,
  authSuccessMessage,
  normalizeEmail,
  profileSetupFailureMessage,
  safeAuthFailureMessage,
  validateEmail,
  validateNewPassword,
  validatePassword
} from "@/auth/validation";

describe("auth validation", () => {
  it("normalizes email before auth calls", () => {
    expect(normalizeEmail(" Runner@Example.COM ")).toBe("runner@example.com");
  });

  it("rejects missing or malformed emails", () => {
    expect(validateEmail("")).toBe("Enter your email address.");
    expect(validateEmail("runner")).toBe("Enter a valid email address.");
    expect(validateEmail("runner@example.com")).toBeNull();
  });

  it("requires passwords and stronger new passwords", () => {
    expect(validatePassword("")).toBe("Enter your password.");
    expect(validatePassword("secret")).toBeNull();
    expect(validateNewPassword("short")).toBe("Use at least 8 characters for your password.");
    expect(validateNewPassword("long-enough")).toBeNull();
  });

  it("uses safe user-facing auth messages", () => {
    expect(accountServicesUnavailableMessage()).toBe("Account services are not configured for this preview.");
    expect(profileSetupFailureMessage()).toBe("Signed in, but profile setup could not be completed. Please try again.");
    expect(safeAuthFailureMessage("signIn")).toBe("Could not sign in. Check your email and password.");
    expect(authSuccessMessage("resetPassword")).toContain("If an account exists");
  });
});
