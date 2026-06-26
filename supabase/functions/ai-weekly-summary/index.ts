import { coachCardSchema } from "../_shared/aiSchemas.ts";
import { handleAiRequest } from "../_shared/aiHandler.ts";

Deno.serve((req) =>
  handleAiRequest(req, {
    feature: "weekly_summary",
    schemaName: "pacepilot_weekly_summary",
    schema: coachCardSchema,
    reportType: "weekly"
  })
);
