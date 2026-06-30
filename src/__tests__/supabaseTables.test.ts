import { describe, expect, it } from "vitest";
import { SUPABASE_TABLES } from "@/lib/supabaseTables";

describe("Supabase table names", () => {
  it("bootstraps privacy defaults into the schema used by AI and exports", () => {
    expect(SUPABASE_TABLES.privacyPreferences).toBe("user_privacy_preferences");
  });

  it("uses the user-owned support request table", () => {
    expect(SUPABASE_TABLES.supportRequests).toBe("support_requests");
  });

  it("uses user-owned activity and training tables", () => {
    expect(SUPABASE_TABLES.trainingPlans).toBe("training_plans");
    expect(SUPABASE_TABLES.workouts).toBe("workouts");
    expect(SUPABASE_TABLES.activities).toBe("activities");
  });
});
