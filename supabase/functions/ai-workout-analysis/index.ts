import { coachCardSchema } from "../_shared/aiSchemas.ts";
import { handleAiRequest } from "../_shared/aiHandler.ts";

Deno.serve((req) =>
  handleAiRequest(req, {
    feature: "workout_analysis",
    schemaName: "pacepilot_workout_analysis",
    schema: coachCardSchema,
    reportType: "workout"
  })
);
