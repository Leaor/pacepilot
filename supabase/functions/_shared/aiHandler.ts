import { getAuthenticatedUser, getServiceClient } from "./auth.ts";
import {
  handleOptions,
  jsonResponse,
  methodNotAllowed,
  readJsonBody,
  safeErrorResponse,
} from "./cors.ts";
import { callOpenAIStructured } from "./openai.ts";
import {
  type AiPrivacySnapshot,
  applyAiDataFirewall,
  sanitizeAiRequestInput,
} from "./aiFirewall.ts";
import {
  type AiDataAccessLogPayload,
  type AiUsageLogPayload,
  buildAiDataAccessLogPayload,
  buildAiUsageLogPayload,
  buildLegacyAiDataAccessLogPayload,
  buildLegacyAiUsageEventPayload,
  isMissingRelation,
} from "./aiLogging.ts";
import {
  buildChatMessageRows,
  buildLegacyChatMessageRows,
  displayAiContent,
  extractRequestedThreadId,
  extractUserQuestion,
  isMissingColumn,
} from "./aiChatPersistence.ts";

type SupabaseServiceClient = ReturnType<typeof getServiceClient>;

type AiHandlerOptions = {
  feature: string;
  schemaName: string;
  schema: Record<string, unknown>;
  reportType?: string;
};

function extractDataCategories(body: Record<string, unknown>): string[] {
  const context = body.context;
  if (typeof context !== "object" || !context) {
    return [];
  }

  const requested = new Set<string>();
  const categories =
    (context as { dataCategoriesUsed?: unknown }).dataCategoriesUsed;
  if (Array.isArray(categories)) {
    for (const category of categories) {
      requested.add(String(category));
    }
  }

  const contextRecord = context as Record<string, unknown>;
  if (
    typeof contextRecord.profileSummary === "string" &&
    contextRecord.profileSummary.trim()
  ) {
    requested.add("profile_onboarding");
  }
  if (Array.isArray(contextRecord.activities) || contextRecord.activity) {
    requested.add("pacepilot_activity");
  }
  if (
    Array.isArray(contextRecord.checkIns) ||
    Array.isArray(contextRecord.checkins)
  ) {
    requested.add("check_ins");
  }

  return Array.from(requested);
}

async function userOwnedThreadId(
  supabase: SupabaseServiceClient,
  userId: string,
  body: Record<string, unknown>,
  title: string,
): Promise<string> {
  const rawThreadId = extractRequestedThreadId(body);
  if (rawThreadId) {
    const { data, error } = await supabase
      .from("ai_chat_threads")
      .select("id")
      .eq("user_id", userId)
      .eq("id", rawThreadId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (data?.id) {
      return data.id as string;
    }
  }

  const { data, error } = await supabase
    .from("ai_chat_threads")
    .insert({
      user_id: userId,
      title,
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return data.id as string;
}

async function insertChatMessages(
  supabase: SupabaseServiceClient,
  userId: string,
  threadId: string,
  userMessage: string,
  assistantMessage: string,
  firewall: { usedSources: string[]; excludedSources: string[] },
) {
  const baseRows = buildChatMessageRows(
    userId,
    threadId,
    userMessage,
    assistantMessage,
    firewall,
  );

  const result = await supabase.from("ai_chat_messages").insert(baseRows);
  if (!result.error) {
    return;
  }

  if (!isMissingColumn(result.error)) {
    throw result.error;
  }

  const legacyRows = buildLegacyChatMessageRows(baseRows);
  const legacyResult = await supabase.from("ai_chat_messages").insert(
    legacyRows,
  );
  if (legacyResult.error) {
    throw legacyResult.error;
  }
}

async function insertAiUsageLog(
  supabase: SupabaseServiceClient,
  payload: AiUsageLogPayload,
  fallbackUsed = false,
) {
  const result = await supabase.from("ai_usage_logs").insert(payload);
  if (!result.error || !isMissingRelation(result.error)) {
    return;
  }

  await supabase.from("ai_usage_events").insert(
    buildLegacyAiUsageEventPayload(payload, fallbackUsed),
  );
}

async function insertAiDataAccessLog(
  supabase: SupabaseServiceClient,
  payload: AiDataAccessLogPayload,
) {
  const result = await supabase.from("ai_data_access_logs").insert(payload);
  if (!result.error || !isMissingColumn(result.error)) {
    return;
  }

  await supabase.from("ai_data_access_logs").insert(
    buildLegacyAiDataAccessLogPayload(payload),
  );
}

export async function handleAiRequest(
  req: Request,
  options: AiHandlerOptions,
): Promise<Response> {
  const optionsResponse = handleOptions(req);
  if (optionsResponse) {
    return optionsResponse;
  }

  if (req.method !== "POST") {
    return methodNotAllowed(req);
  }

  const supabase = getServiceClient();
  const startedAt = performance.now();

  try {
    const user = await getAuthenticatedUser(req);
    const body = await readJsonBody<Record<string, unknown>>(req);
    const dataCategoriesUsed = extractDataCategories(body);

    const { data: privacy } = await supabase
      .from("user_privacy_preferences")
      .select([
        "ai_coach_enabled",
        "ai_can_use_pacepilot_activity_history",
        "ai_can_use_checkins",
        "ai_can_use_race_goals",
        "ai_can_use_chat_history",
        "ai_can_use_user_provided_imports",
        "ai_can_use_garmin_data",
        "ai_can_use_apple_health_data",
      ].join(","))
      .eq("user_id", user.id)
      .maybeSingle();

    const privacySnapshot = privacy as
      | (AiPrivacySnapshot & { ai_coach_enabled?: boolean | null })
      | null;
    const firewall = applyAiDataFirewall(dataCategoriesUsed, privacySnapshot);

    if (!privacySnapshot?.ai_coach_enabled) {
      await insertAiUsageLog(
        supabase,
        buildAiUsageLogPayload(
          user.id,
          options.feature,
          Deno.env.get("OPENAI_MODEL") ?? "gpt-5.5",
          performance.now() - startedAt,
          "blocked",
        ),
      );
      await insertAiDataAccessLog(
        supabase,
        buildAiDataAccessLogPayload(
          user.id,
          options.feature,
          firewall.usedSources,
          firewall.excludedSources,
          privacySnapshot,
        ),
      );
      return jsonResponse({ error: "AI Coach is not enabled" }, 403, req);
    }

    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("tier, status")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing", "trial"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const tier = subscription?.tier ?? "free";
    const requiresElite = options.feature === "coach_chat";
    const tierAllowed = requiresElite
      ? tier === "elite"
      : tier === "pro" || tier === "elite";

    if (!tierAllowed) {
      await insertAiUsageLog(
        supabase,
        buildAiUsageLogPayload(
          user.id,
          options.feature,
          Deno.env.get("OPENAI_MODEL") ?? "gpt-5.5",
          performance.now() - startedAt,
          "blocked",
        ),
      );
      await insertAiDataAccessLog(
        supabase,
        buildAiDataAccessLogPayload(
          user.id,
          options.feature,
          firewall.usedSources,
          firewall.excludedSources,
          privacySnapshot,
        ),
      );
      return jsonResponse(
        {
          error: requiresElite
            ? "AI Coach requires Elite"
            : "This AI feature requires Pro or Elite",
        },
        402,
        req,
      );
    }

    const sanitizedBody = sanitizeAiRequestInput(
      body,
      privacySnapshot,
      firewall,
    );

    const result = await callOpenAIStructured({
      feature: options.feature,
      userId: user.id,
      input: sanitizedBody,
      schemaName: options.schemaName,
      schema: options.schema,
      dataCategoriesUsed: firewall.usedSources,
      supabase,
    });

    await insertAiUsageLog(
      supabase,
      buildAiUsageLogPayload(
        user.id,
        options.feature,
        result.model,
        result.latencyMs,
        "success",
        result.usage,
      ),
      result.fallbackUsed,
    );

    await insertAiDataAccessLog(
      supabase,
      buildAiDataAccessLogPayload(
        user.id,
        options.feature,
        firewall.usedSources,
        firewall.excludedSources,
        privacySnapshot,
      ),
    );

    if (options.reportType) {
      await supabase.from("ai_analysis_reports").insert({
        user_id: user.id,
        report_type: options.reportType,
        content: result.content,
        data_categories_used: firewall.usedSources,
      });
    }

    if (
      options.feature === "coach_chat" &&
      privacySnapshot.ai_can_use_chat_history
    ) {
      const userQuestion = extractUserQuestion(sanitizedBody);
      if (userQuestion) {
        const threadId = await userOwnedThreadId(
          supabase,
          user.id,
          sanitizedBody,
          "Ask Coach",
        );
        await insertChatMessages(
          supabase,
          user.id,
          threadId,
          userQuestion,
          displayAiContent(result.content),
          firewall,
        );
      }
    }

    return jsonResponse(
      {
        model: result.model,
        fallbackUsed: result.fallbackUsed,
        dataCategoriesUsed: firewall.usedSources,
        excludedSources: firewall.excludedSources,
        result: result.content,
      },
      200,
      req,
    );
  } catch (error) {
    return safeErrorResponse(error, "AI request failed", req);
  }
}
