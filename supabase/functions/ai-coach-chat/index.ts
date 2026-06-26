import { coachCardSchema } from "../_shared/aiSchemas.ts";
import { handleAiRequest } from "../_shared/aiHandler.ts";

Deno.serve((req) =>
  handleAiRequest(req, {
    feature: "coach_chat",
    schemaName: "pacepilot_coach_chat",
    schema: coachCardSchema
  })
);
