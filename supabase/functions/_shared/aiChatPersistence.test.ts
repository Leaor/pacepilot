import {
  buildChatMessageRows,
  buildLegacyChatMessageRows,
  displayAiContent,
  extractRequestedThreadId,
  extractUserQuestion,
  isMissingColumn,
} from "./aiChatPersistence.ts";

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

Deno.test("AI chat persistence extracts bounded user prompts", () => {
  const longQuestion = ` ${"pace ".repeat(3_000)} `;
  const question = extractUserQuestion({ question: longQuestion });

  assert(question.length === 8_000, "expected long prompt to be bounded");
  assert(question.startsWith("pace pace"), "expected trimmed question text");
  assert(
    extractUserQuestion({ message: "  hello coach  " }) === "hello coach",
    "expected message fallback",
  );
  assert(
    extractUserQuestion({ prompt: "tempo?" }) === "tempo?",
    "expected prompt fallback",
  );
  assert(
    extractUserQuestion({ question: 42 }) === "",
    "expected non-string question to be ignored",
  );
});

Deno.test("AI chat persistence extracts only explicit thread ids", () => {
  assert(
    extractRequestedThreadId({ threadID: " thread-a " }) === "thread-a",
    "expected threadID support",
  );
  assert(
    extractRequestedThreadId({ threadId: "thread-b" }) === "thread-b",
    "expected threadId support",
  );
  assert(
    extractRequestedThreadId({ thread_id: "thread-c" }) === "thread-c",
    "expected thread_id support",
  );
  assert(
    extractRequestedThreadId({ threadId: "" }) === "",
    "expected blank thread id to be ignored",
  );
  assert(
    extractRequestedThreadId({ threadId: 123 }) === "",
    "expected non-string thread id to be ignored",
  );
});

Deno.test("AI chat persistence normalizes assistant display content", () => {
  assert(
    displayAiContent("direct answer") === "direct answer",
    "expected string content passthrough",
  );
  assert(
    displayAiContent({ answer: "run easy" }) === "run easy",
    "expected answer field extraction",
  );
  assert(
    displayAiContent({ strategySummary: "negative split" }) ===
      "negative split",
    "expected strategy summary extraction",
  );
  assert(
    displayAiContent({ nested: true }) === '{"nested":true}',
    "expected JSON fallback",
  );
  assert(
    displayAiContent(undefined) === "",
    "expected undefined content to become empty text",
  );
});

Deno.test("AI chat persistence builds modern and legacy rows", () => {
  const rows = buildChatMessageRows(
    "user-1",
    "thread-1",
    "What now?",
    "Rest today.",
    {
      usedSources: ["pacepilot_activity"],
      excludedSources: ["strava_cache"],
    },
  );

  assert(rows.length === 2, "expected user and assistant rows");
  assert(rows[0].role === "user", "expected first row to be the user message");
  assert(
    rows[1].role === "assistant",
    "expected second row to be the assistant message",
  );
  assert(
    rows[0].used_sources[0] === "pacepilot_activity",
    "expected used sources on modern rows",
  );
  assert(
    rows[0].excluded_sources[0] === "strava_cache",
    "expected excluded sources on modern rows",
  );

  const legacyRows = buildLegacyChatMessageRows(rows);
  assert(
    legacyRows[0].allowed_data_sources[0] === "pacepilot_activity",
    "expected legacy allowed sources",
  );
  assert(
    !("used_sources" in legacyRows[0]),
    "expected legacy rows to omit used_sources",
  );
  assert(
    !("excluded_sources" in legacyRows[0]),
    "expected legacy rows to omit excluded_sources",
  );
});

Deno.test("AI chat persistence detects missing-column errors", () => {
  assert(
    isMissingColumn({ code: "42703" }),
    "expected Postgres missing-column code",
  );
  assert(
    isMissingColumn({
      message: "Could not find the 'used_sources' column in the schema cache",
    }),
    "expected schema cache miss",
  );
  assert(
    !isMissingColumn({ code: "23505", message: "duplicate key" }),
    "expected unrelated errors to pass through",
  );
});
