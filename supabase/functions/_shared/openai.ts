import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

type CallOpenAIOptions = {
  feature: string;
  userId: string;
  input: unknown;
  schemaName: string;
  schema: Record<string, unknown>;
  dataCategoriesUsed: string[];
  systemInstruction?: string;
  supabase: SupabaseClient;
};

type OpenAIResult = {
  model: string;
  fallbackUsed: boolean;
  content: unknown;
  usage: Record<string, unknown>;
  latencyMs: number;
};

const defaultSystemInstruction = [
  "You are PacePilot's AI Coach.",
  "Training guidance is educational and not medical advice.",
  "Do not diagnose injury, prescribe treatment, or override deterministic PacePilot safety rules.",
  "Use only the supplied PacePilot-authorized context.",
  "Return structured JSON that fits the provided schema."
].join(" ");

function containsForbiddenSources(input: unknown): boolean {
  const text = JSON.stringify(input)?.toLowerCase() ?? "";
  return (
    text.includes('"source":"strava_cache"') ||
    text.includes("strava_access_token") ||
    text.includes("strava_refresh_token") ||
    text.includes("protected_race_data") ||
    text.includes("scraped_race_data")
  );
}

function assertNoForbiddenSources(input: unknown): void {
  if (containsForbiddenSources(input)) {
    throw new Error("Forbidden AI data source detected");
  }
}

function extractOutputText(payload: Record<string, unknown>): string {
  const output = Array.isArray(payload.output) ? payload.output : [];
  for (const item of output) {
    const content = typeof item === "object" && item ? (item as { content?: unknown }).content : undefined;
    if (!Array.isArray(content)) {
      continue;
    }

    for (const part of content) {
      if (typeof part === "object" && part && (part as { type?: string }).type === "output_text") {
        return String((part as { text?: string }).text ?? "");
      }
    }
  }

  return "";
}

async function insertAudit(
  supabase: SupabaseClient,
  userId: string,
  feature: string,
  model: string,
  dataCategoriesUsed: string[],
  tokenUsage: Record<string, unknown>,
  latencyMs: number,
  status: "success" | "error" | "blocked",
  errorCategory?: string
) {
  await supabase.from("ai_prompt_audit_events").insert({
    user_id: userId,
    feature,
    model,
    data_categories_used: dataCategoriesUsed,
    token_usage: tokenUsage,
    latency_ms: latencyMs,
    status,
    error_category: errorCategory,
    raw_content_stored: false
  });
}

async function insertPromptAudit(
  options: CallOpenAIOptions,
  model: string,
  tokenUsage: Record<string, unknown>,
  latencyMs: number,
  status: "success" | "error" | "blocked",
  errorCategory?: string
) {
  await insertAudit(
    options.supabase,
    options.userId,
    options.feature,
    model,
    options.dataCategoriesUsed,
    tokenUsage,
    latencyMs,
    status,
    errorCategory
  );
}

async function insertPromptAuditSafely(
  options: CallOpenAIOptions,
  model: string,
  tokenUsage: Record<string, unknown>,
  latencyMs: number,
  status: "success" | "error" | "blocked",
  errorCategory?: string
) {
  try {
    await insertPromptAudit(
      options,
      model,
      tokenUsage,
      latencyMs,
      status,
      errorCategory
    );
  } catch {
    // Prompt-audit writes should not cause a second OpenAI request or mask the original AI outcome.
  }
}

async function requestOpenAI(
  model: string,
  options: CallOpenAIOptions
): Promise<{ payload: Record<string, unknown>; latencyMs: number }> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  const startedAt = performance.now();
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      store: false,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: options.systemInstruction ?? defaultSystemInstruction
            }
          ]
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: JSON.stringify(options.input)
            }
          ]
        }
      ],
      reasoning: {
        effort: "low"
      },
      text: {
        verbosity: "low",
        format: {
          type: "json_schema",
          name: options.schemaName,
          strict: true,
          schema: options.schema
        }
      }
    })
  });

  const latencyMs = Math.round(performance.now() - startedAt);
  const payload = (await response.json()) as Record<string, unknown>;

  if (!response.ok) {
    throw new Error(String(payload.error ?? `OpenAI request failed with ${response.status}`));
  }

  return { payload, latencyMs };
}

export async function callOpenAIStructured(options: CallOpenAIOptions): Promise<OpenAIResult> {
  const premiumModel = Deno.env.get("OPENAI_MODEL") ?? Deno.env.get("OPENAI_PREMIUM_MODEL") ?? "gpt-5.5";
  const fallbackModel = Deno.env.get("OPENAI_FALLBACK_MODEL") ?? premiumModel;

  if (containsForbiddenSources(options.input)) {
    await insertPromptAuditSafely(
      options,
      premiumModel,
      {},
      0,
      "blocked",
      "forbidden_source"
    );
    assertNoForbiddenSources(options.input);
  }

  const premiumStartedAt = performance.now();

  try {
    const { payload, latencyMs } = await requestOpenAI(premiumModel, options);
    const outputText = extractOutputText(payload);
    const usage = (payload.usage as Record<string, unknown> | undefined) ?? {};
    const content = JSON.parse(outputText);
    await insertPromptAuditSafely(
      options,
      premiumModel,
      usage,
      latencyMs,
      "success"
    );

    return {
      model: premiumModel,
      fallbackUsed: false,
      content,
      usage,
      latencyMs
    };
  } catch (error) {
    await insertPromptAuditSafely(
      options,
      premiumModel,
      {},
      performance.now() - premiumStartedAt,
      "error",
      "premium_failed"
    );

    if (fallbackModel === premiumModel) {
      throw error;
    }

    const fallbackStartedAt = performance.now();
    try {
      const { payload, latencyMs } = await requestOpenAI(fallbackModel, options);
      const outputText = extractOutputText(payload);
      const usage = (payload.usage as Record<string, unknown> | undefined) ?? {};
      const content = JSON.parse(outputText);
      await insertPromptAuditSafely(
        options,
        fallbackModel,
        usage,
        latencyMs,
        "success"
      );

      return {
        model: fallbackModel,
        fallbackUsed: true,
        content,
        usage,
        latencyMs
      };
    } catch (fallbackError) {
      await insertPromptAuditSafely(
        options,
        fallbackModel,
        {},
        performance.now() - fallbackStartedAt,
        "error",
        "fallback_failed"
      );
      throw fallbackError;
    }
  }
}
