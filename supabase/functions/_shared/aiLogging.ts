export type AiLogStatus = "success" | "error" | "blocked";

export type AiUsageLogPayload = {
  user_id: string;
  feature: string;
  model: string;
  input_tokens?: number | null;
  output_tokens?: number | null;
  total_tokens?: number | null;
  latency_ms: number;
  status: AiLogStatus;
};

export type LegacyAiUsageEventPayload = AiUsageLogPayload & {
  fallback_used: boolean;
};

export type AiDataAccessLogPayload = {
  user_id: string;
  feature: string;
  used_sources: string[];
  excluded_sources: string[];
  privacy_snapshot: Record<string, unknown>;
};

export type LegacyAiDataAccessLogPayload = {
  user_id: string;
  feature: string;
  data_sources_used: string[];
  excluded_sources: string[];
  reason: string;
};

type DbError = {
  code?: string;
  message?: string;
};

type UsageMetrics = {
  input_tokens?: unknown;
  output_tokens?: unknown;
  total_tokens?: unknown;
};

export function numericToken(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function isMissingRelation(error: DbError | null | undefined): boolean {
  return error?.code === "42P01" ||
    /relation .* does not exist|schema cache/i.test(error?.message ?? "");
}

export function buildAiUsageLogPayload(
  userId: string,
  feature: string,
  model: string,
  latencyMs: number,
  status: AiLogStatus,
  usage: UsageMetrics = {},
): AiUsageLogPayload {
  return {
    user_id: userId,
    feature,
    model,
    input_tokens: numericToken(usage.input_tokens),
    output_tokens: numericToken(usage.output_tokens),
    total_tokens: numericToken(usage.total_tokens),
    latency_ms: Math.round(latencyMs),
    status,
  };
}

export function buildLegacyAiUsageEventPayload(
  payload: AiUsageLogPayload,
  fallbackUsed = false,
): LegacyAiUsageEventPayload {
  return {
    ...payload,
    fallback_used: fallbackUsed,
  };
}

export function buildAiDataAccessLogPayload(
  userId: string,
  feature: string,
  usedSources: string[],
  excludedSources: string[],
  privacySnapshot: Record<string, unknown> | null,
): AiDataAccessLogPayload {
  return {
    user_id: userId,
    feature,
    used_sources: usedSources,
    excluded_sources: excludedSources,
    privacy_snapshot: privacySnapshot ?? {},
  };
}

export function buildLegacyAiDataAccessLogPayload(
  payload: AiDataAccessLogPayload,
): LegacyAiDataAccessLogPayload {
  return {
    user_id: payload.user_id,
    feature: payload.feature,
    data_sources_used: payload.used_sources,
    excluded_sources: payload.excluded_sources,
    reason: "AI data access",
  };
}
