import { callOpenAIStructured } from "./openai.ts";

const envKeys = [
  "OPENAI_API_KEY",
  "OPENAI_MODEL",
  "OPENAI_PREMIUM_MODEL",
  "OPENAI_FALLBACK_MODEL",
] as const;

type AuditRow = {
  user_id: string;
  feature: string;
  model: string;
  token_usage: Record<string, unknown>;
  latency_ms: number;
  status: "success" | "error" | "blocked";
  error_category?: string;
  raw_content_stored: boolean;
};

type FetchStep = {
  status: number;
  body: Record<string, unknown>;
};

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

async function withOpenAiEnv<T>(
  values: Partial<Record<(typeof envKeys)[number], string>>,
  fn: () => T | Promise<T>,
): Promise<T> {
  const previous = new Map(envKeys.map((key) => [key, Deno.env.get(key)]));
  for (const key of envKeys) {
    Deno.env.delete(key);
  }

  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) {
      Deno.env.set(key, value);
    }
  }

  try {
    return await fn();
  } finally {
    for (const key of envKeys) {
      Deno.env.delete(key);
      const previousValue = previous.get(key);
      if (previousValue !== undefined) {
        Deno.env.set(key, previousValue);
      }
    }
  }
}

function outputBody(content: unknown, usage: Record<string, unknown> = {}) {
  return {
    output: [
      {
        content: [
          {
            type: "output_text",
            text: JSON.stringify(content),
          },
        ],
      },
    ],
    usage,
  };
}

function createSupabase(auditRows: AuditRow[]) {
  return {
    from(table: string) {
      assert(table === "ai_prompt_audit_events", "expected prompt-audit table");
      return {
        async insert(row: AuditRow) {
          auditRows.push(row);
          return { error: null };
        },
      };
    },
  };
}

function createOptions(auditRows: AuditRow[], input: unknown = { question: "How should I adjust my week?" }) {
  return {
    feature: "coach_chat",
    userId: "user-1",
    input,
    schemaName: "pacepilot_test",
    schema: {
      type: "object",
      additionalProperties: true,
    },
    dataCategoriesUsed: ["pacepilot_activity"],
    supabase: createSupabase(auditRows) as never,
  };
}

async function withMockFetch<T>(
  steps: FetchStep[],
  fn: (requests: Array<Record<string, unknown>>) => T | Promise<T>,
): Promise<T> {
  const previousFetch = globalThis.fetch;
  const requests: Array<Record<string, unknown>> = [];

  globalThis.fetch = (async (_input: string | URL | Request, init?: RequestInit) => {
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : {};
    requests.push(body);

    const next = steps.shift();
    if (!next) {
      throw new Error("Unexpected fetch call");
    }

    return new Response(JSON.stringify(next.body), { status: next.status });
  }) as typeof fetch;

  try {
    return await fn(requests);
  } finally {
    globalThis.fetch = previousFetch;
  }
}

Deno.test("OpenAI helper audits premium failure and fallback success", async () => {
  await withOpenAiEnv({
    OPENAI_API_KEY: "sk-test",
    OPENAI_MODEL: "gpt-premium",
    OPENAI_FALLBACK_MODEL: "gpt-fallback",
  }, async () => {
    const auditRows: AuditRow[] = [];

    await withMockFetch([
      { status: 500, body: { error: "premium unavailable" } },
      {
        status: 200,
        body: outputBody({ answer: "Use the fallback safely." }, {
          input_tokens: 10,
          output_tokens: 6,
          total_tokens: 16,
        }),
      },
    ], async (requests) => {
      const result = await callOpenAIStructured(createOptions(auditRows));

      assert(requests.length === 2, "expected premium and fallback requests");
      assert(requests[0].model === "gpt-premium", "expected premium model first");
      assert(requests[1].model === "gpt-fallback", "expected fallback model second");
      assert(result.model === "gpt-fallback", "expected fallback model result");
      assert(result.fallbackUsed === true, "expected fallback flag");
      assert(auditRows.length === 2, "expected failure and success audits");
      assert(auditRows[0].status === "error", "expected premium error audit");
      assert(auditRows[0].error_category === "premium_failed", "expected premium error category");
      assert(auditRows[0].raw_content_stored === false, "expected no raw content storage");
      assert(auditRows[1].status === "success", "expected fallback success audit");
      assert(auditRows[1].model === "gpt-fallback", "expected fallback audit model");
      assert(auditRows[1].token_usage.total_tokens === 16, "expected token usage audit");
    });
  });
});

Deno.test("OpenAI helper does not retry when fallback model matches premium", async () => {
  await withOpenAiEnv({
    OPENAI_API_KEY: "sk-test",
    OPENAI_MODEL: "gpt-same",
  }, async () => {
    const auditRows: AuditRow[] = [];

    await withMockFetch([
      { status: 500, body: { error: "model unavailable" } },
    ], async (requests) => {
      let rejected = false;
      try {
        await callOpenAIStructured(createOptions(auditRows));
      } catch {
        rejected = true;
      }

      assert(rejected, "expected request to fail");
      assert(requests.length === 1, "expected one request without same-model retry");
      assert(auditRows.length === 1, "expected one error audit");
      assert(auditRows[0].model === "gpt-same", "expected same model in audit");
      assert(auditRows[0].status === "error", "expected error audit");
    });
  });
});

Deno.test("OpenAI helper treats malformed premium JSON as an error before fallback", async () => {
  await withOpenAiEnv({
    OPENAI_API_KEY: "sk-test",
    OPENAI_MODEL: "gpt-premium",
    OPENAI_FALLBACK_MODEL: "gpt-fallback",
  }, async () => {
    const auditRows: AuditRow[] = [];

    await withMockFetch([
      {
        status: 200,
        body: {
          output: [
            {
              content: [
                {
                  type: "output_text",
                  text: "{not-json",
                },
              ],
            },
          ],
          usage: { total_tokens: 8 },
        },
      },
      {
        status: 200,
        body: outputBody({ answer: "Fallback repaired the shape." }),
      },
    ], async () => {
      const result = await callOpenAIStructured(createOptions(auditRows));

      assert(result.model === "gpt-fallback", "expected fallback after malformed JSON");
      assert(auditRows.length === 2, "expected premium error and fallback success audits");
      assert(auditRows[0].status === "error", "expected malformed premium output to be an error");
      assert(auditRows[0].error_category === "premium_failed", "expected premium failure category");
      assert(auditRows[1].status === "success", "expected fallback success");
    });
  });
});

Deno.test("OpenAI helper audits forbidden AI sources before network calls", async () => {
  await withOpenAiEnv({
    OPENAI_API_KEY: "sk-test",
    OPENAI_MODEL: "gpt-premium",
    OPENAI_FALLBACK_MODEL: "gpt-fallback",
  }, async () => {
    const auditRows: AuditRow[] = [];

    await withMockFetch([], async (requests) => {
      let rejected = false;
      try {
        await callOpenAIStructured(createOptions(auditRows, {
          context: {
            activities: [{ source: "strava_cache" }],
          },
        }));
      } catch {
        rejected = true;
      }

      assert(rejected, "expected forbidden source rejection");
      assert(requests.length === 0, "expected no network calls");
      assert(auditRows.length === 1, "expected blocked audit");
      assert(auditRows[0].status === "blocked", "expected blocked status");
      assert(auditRows[0].error_category === "forbidden_source", "expected forbidden-source category");
      assert(auditRows[0].raw_content_stored === false, "expected no raw content storage");
    });
  });
});
