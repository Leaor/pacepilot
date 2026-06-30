import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const forbiddenClientSecretKeys = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "OPENAI_API_KEY",
  "STRAVA_CLIENT_SECRET",
  "GARMIN_CLIENT_SECRET",
  "TOKEN_ENCRYPTION_KEY",
  "OAUTH_STATE_SECRET",
  "WEBHOOK_SECRET",
  "WEBHOOK_VERIFY_TOKEN"
];

function readRepoFile(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("environment templates", () => {
  it("keeps the root Expo env example limited to public client variables", () => {
    const rootExample = readRepoFile(".env.example");
    const variableNames = rootExample
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => line.split("=")[0]);

    expect(variableNames.length).toBeGreaterThan(0);
    expect(variableNames.every((name) => name.startsWith("EXPO_PUBLIC_"))).toBe(true);

    for (const secretKey of forbiddenClientSecretKeys) {
      expect(rootExample.includes(secretKey)).toBe(false);
    }
  });

  it("documents server-only Edge Function secrets separately", () => {
    const edgeExample = readRepoFile("supabase/.env.edge.example");

    expect(edgeExample).toContain("SUPABASE_SERVICE_ROLE_KEY=");
    expect(edgeExample).toContain("OPENAI_API_KEY=");
    expect(edgeExample).toContain("STRAVA_CLIENT_SECRET=");
    expect(edgeExample).toContain("CORS_ALLOWED_ORIGINS=");
  });
});
