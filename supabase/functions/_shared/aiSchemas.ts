export const coachCardSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    warnings: { type: "array", items: { type: "string" } },
    suggestedAdjustments: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          rationale: { type: "string" },
          safeToApply: { type: "boolean" }
        },
        required: ["title", "rationale", "safeToApply"]
      }
    },
    uiCards: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          body: { type: "string" },
          severity: { type: "string", enum: ["info", "warning", "success"] }
        },
        required: ["title", "body", "severity"]
      }
    },
    dataCategoriesUsed: { type: "array", items: { type: "string" } }
  },
  required: ["summary", "warnings", "suggestedAdjustments", "uiCards", "dataCategoriesUsed"]
};

export const raceStrategySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    strategySummary: { type: "string" },
    pacingPlan: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          segment: { type: "string" },
          targetEffort: { type: "string" },
          note: { type: "string" }
        },
        required: ["segment", "targetEffort", "note"]
      }
    },
    raceWeekChecklist: { type: "array", items: { type: "string" } },
    warnings: { type: "array", items: { type: "string" } },
    dataCategoriesUsed: { type: "array", items: { type: "string" } }
  },
  required: ["strategySummary", "pacingPlan", "raceWeekChecklist", "warnings", "dataCategoriesUsed"]
};
