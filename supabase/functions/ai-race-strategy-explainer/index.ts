import { raceStrategySchema } from "../_shared/aiSchemas.ts";
import { handleAiRequest } from "../_shared/aiHandler.ts";

Deno.serve((req) =>
  handleAiRequest(req, {
    feature: "race_strategy_explainer",
    schemaName: "pacepilot_race_strategy_explainer",
    schema: raceStrategySchema,
    reportType: "race_strategy"
  })
);
