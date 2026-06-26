import { raceStrategySchema } from "../_shared/aiSchemas.ts";
import { handleAiRequest } from "../_shared/aiHandler.ts";

Deno.serve((req) =>
  handleAiRequest(req, {
    feature: "race_strategy",
    schemaName: "pacepilot_race_strategy",
    schema: raceStrategySchema,
    reportType: "race_strategy"
  })
);
