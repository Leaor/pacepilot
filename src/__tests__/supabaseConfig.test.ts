import { describe, expect, it } from "vitest";
import { isUsableSupabaseAnonKey, isUsableSupabaseUrl, readSupabasePublicConfig } from "@/lib/supabaseConfig";

const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.demo-key";

describe("Supabase public config", () => {
  it("rejects missing, placeholder, and malformed values", () => {
    expect(readSupabasePublicConfig("", "").configured).toBe(false);
    expect(readSupabasePublicConfig("https://pacepilot-not-configured.invalid", "not-configured").configured).toBe(false);
    expect(readSupabasePublicConfig("not a url", anonKey).configured).toBe(false);
    expect(readSupabasePublicConfig("https://example.supabase.co", "short").configured).toBe(false);
  });

  it("accepts HTTPS and local Supabase URLs with non-placeholder anon keys", () => {
    expect(readSupabasePublicConfig("https://example.supabase.co", anonKey).configured).toBe(true);
    expect(readSupabasePublicConfig("http://127.0.0.1:54321", anonKey).configured).toBe(true);
  });

  it("normalizes whitespace before checking values", () => {
    const config = readSupabasePublicConfig(" https://example.supabase.co ", ` ${anonKey} `);

    expect(config).toEqual({
      url: "https://example.supabase.co",
      anonKey,
      configured: true
    });
  });

  it("keeps the URL and key checks independently testable", () => {
    expect(isUsableSupabaseUrl("ftp://example.supabase.co")).toBe(false);
    expect(isUsableSupabaseAnonKey("placeholder-anon-key")).toBe(false);
  });
});
