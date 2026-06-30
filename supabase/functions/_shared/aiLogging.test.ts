import {
  buildAiDataAccessLogPayload,
  buildAiUsageLogPayload,
  buildLegacyAiDataAccessLogPayload,
  buildLegacyAiUsageEventPayload,
  isMissingRelation,
  numericToken,
} from "./aiLogging.ts";

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

Deno.test("AI logging keeps token metrics finite", () => {
  assert(numericToken(123) === 123, "expected finite token number");
  assert(numericToken(Number.NaN) === null, "expected NaN to be discarded");
  assert(
    numericToken("123") === null,
    "expected string token count to be discarded",
  );
});

Deno.test("AI logging builds usage payloads for new and legacy schemas", () => {
  const payload = buildAiUsageLogPayload(
    "user-1",
    "coach_chat",
    "gpt-test",
    12.7,
    "success",
    {
      input_tokens: 10,
      output_tokens: 20,
      total_tokens: 30,
    },
  );

  assert(payload.latency_ms === 13, "expected rounded latency");
  assert(payload.input_tokens === 10, "expected input token count");

  const legacy = buildLegacyAiUsageEventPayload(payload, true);
  assert(
    legacy.fallback_used === true,
    "expected fallback flag for legacy usage events",
  );
});

Deno.test("AI logging builds data access payloads for new and legacy schemas", () => {
  const payload = buildAiDataAccessLogPayload(
    "user-1",
    "coach_chat",
    ["pacepilot_activity"],
    ["strava_cache"],
    { ai_can_use_pacepilot_activity_history: true },
  );

  assert(
    payload.used_sources[0] === "pacepilot_activity",
    "expected modern used sources",
  );
  assert(
    payload.privacy_snapshot.ai_can_use_pacepilot_activity_history === true,
    "expected privacy snapshot",
  );

  const legacy = buildLegacyAiDataAccessLogPayload(payload);
  assert(
    legacy.data_sources_used[0] === "pacepilot_activity",
    "expected legacy data_sources_used",
  );
  assert(
    legacy.excluded_sources[0] === "strava_cache",
    "expected legacy excluded sources",
  );
  assert(legacy.reason === "AI data access", "expected legacy reason");
});

Deno.test("AI logging detects missing usage-log relations", () => {
  assert(
    isMissingRelation({ code: "42P01" }),
    "expected missing relation code",
  );
  assert(
    isMissingRelation({
      message: 'relation "public.ai_usage_logs" does not exist',
    }),
    "expected relation message",
  );
  assert(
    !isMissingRelation({ code: "23505", message: "duplicate key" }),
    "expected unrelated errors to pass through",
  );
});
