import { coachCardSchema } from "../_shared/aiSchemas.ts";
import { handleAiRequest } from "../_shared/aiHandler.ts";

Deno.serve((req) =>
  handleAiRequest(req, {
    feature: "run_analysis",
    schemaName: "pacepilot_run_analysis",
    schema: coachCardSchema,
    reportType: "workout"
  })
);
