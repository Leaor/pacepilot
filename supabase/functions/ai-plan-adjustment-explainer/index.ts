import { coachCardSchema } from "../_shared/aiSchemas.ts";
import { handleAiRequest } from "../_shared/aiHandler.ts";

Deno.serve((req) =>
  handleAiRequest(req, {
    feature: "plan_adjustment_explainer",
    schemaName: "pacepilot_plan_adjustment_explainer",
    schema: coachCardSchema
  })
);
