import { coachCardSchema } from "../_shared/aiSchemas.ts";
import { handleAiRequest } from "../_shared/aiHandler.ts";

Deno.serve((req) =>
  handleAiRequest(req, {
    feature: "weekly_analysis",
    schemaName: "pacepilot_weekly_analysis",
    schema: coachCardSchema,
    reportType: "weekly"
  })
);
