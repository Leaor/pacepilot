import { getAuthenticatedUser, getServiceClient } from "./auth.ts";
import { handleOptions, jsonResponse, methodNotAllowed, readJsonBody, safeErrorResponse } from "./cors.ts";
import { callOpenAIStructured } from "./openai.ts";
import { applyAiDataFirewall } from "./aiFirewall.ts";

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

  const categories = (context as { dataCategoriesUsed?: unknown }).dataCategoriesUsed;
  return Array.isArray(categories) ? categories.map(String) : [];
}

export async function handleAiRequest(req: Request, options: AiHandlerOptions): Promise<Response> {
  const optionsResponse = handleOptions(req);
  if (optionsResponse) {
    return optionsResponse;
  }

  if (req.method !== "POST") {
    return methodNotAllowed();
  }

  const supabase = getServiceClient();
  const startedAt = performance.now();

  try {
    const user = await getAuthenticatedUser(req);
    const body = await readJsonBody<Record<string, unknown>>(req);
    const dataCategoriesUsed = extractDataCategories(body);
    const firewall = applyAiDataFirewall(dataCategoriesUsed);

    const { data: privacy } = await supabase
      .from("user_privacy_preferences")
      .select("ai_coach_enabled, ai_can_use_chat_history")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!privacy?.ai_coach_enabled) {
      await supabase.from("ai_usage_logs").insert({
        user_id: user.id,
        feature: options.feature,
        model: Deno.env.get("OPENAI_MODEL") ?? "gpt-5.5",
        latency_ms: Math.round(performance.now() - startedAt),
        status: "blocked",
      });
      await supabase.from("ai_data_access_logs").insert({
        user_id: user.id,
        feature: options.feature,
        used_sources: firewall.usedSources,
        excluded_sources: firewall.excludedSources,
        privacy_snapshot: privacy ?? {}
      });
      return jsonResponse({ error: "AI Coach is not enabled" }, 403);
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
    const tierAllowed = requiresElite ? tier === "elite" : tier === "pro" || tier === "elite";

    if (!tierAllowed) {
      await supabase.from("ai_usage_logs").insert({
        user_id: user.id,
        feature: options.feature,
        model: Deno.env.get("OPENAI_MODEL") ?? "gpt-5.5",
        latency_ms: Math.round(performance.now() - startedAt),
        status: "blocked"
      });
      await supabase.from("ai_data_access_logs").insert({
        user_id: user.id,
        feature: options.feature,
        used_sources: firewall.usedSources,
        excluded_sources: firewall.excludedSources,
        privacy_snapshot: privacy
      });
      return jsonResponse({ error: requiresElite ? "AI Coach requires Elite" : "This AI feature requires Pro or Elite" }, 402);
    }

    const result = await callOpenAIStructured({
      feature: options.feature,
      userId: user.id,
      input: body,
      schemaName: options.schemaName,
      schema: options.schema,
      dataCategoriesUsed: firewall.usedSources,
      supabase
    });

    await supabase.from("ai_usage_logs").insert({
      user_id: user.id,
      feature: options.feature,
      model: result.model,
      input_tokens: typeof result.usage.input_tokens === "number" ? result.usage.input_tokens : null,
      output_tokens: typeof result.usage.output_tokens === "number" ? result.usage.output_tokens : null,
      total_tokens: typeof result.usage.total_tokens === "number" ? result.usage.total_tokens : null,
      latency_ms: result.latencyMs,
      status: "success"
    });

    await supabase.from("ai_data_access_logs").insert({
      user_id: user.id,
      feature: options.feature,
      used_sources: firewall.usedSources,
      excluded_sources: firewall.excludedSources,
      privacy_snapshot: privacy
    });

    if (options.reportType) {
      await supabase.from("ai_analysis_reports").insert({
        user_id: user.id,
        report_type: options.reportType,
        content: result.content,
        data_categories_used: firewall.usedSources
      });
    }

    if (options.feature === "coach_chat" && privacy.ai_can_use_chat_history) {
      const { data: conversation } = await supabase
        .from("ai_chat_threads")
        .insert({
          user_id: user.id,
          title: "Ask Coach"
        })
        .select("id")
        .single();

      if (conversation?.id) {
        await supabase.from("ai_chat_messages").insert({
          user_id: user.id,
          thread_id: conversation.id,
          role: "assistant",
          content: result.content,
          used_sources: firewall.usedSources,
          excluded_sources: firewall.excludedSources
        });
      }
    }

    return jsonResponse({
      model: result.model,
      fallbackUsed: result.fallbackUsed,
      dataCategoriesUsed: firewall.usedSources,
      excludedSources: firewall.excludedSources,
      result: result.content
    });
  } catch (error) {
    return safeErrorResponse(error, "AI request failed");
  }
}
