import { getAuthenticatedUser, getServiceClient } from "../_shared/auth.ts";
import { handleOptions, jsonResponse, methodNotAllowed, safeErrorResponse } from "../_shared/cors.ts";

const exportTables = [
  { key: "profiles", table: "profiles", userColumn: "id" },
  { key: "privacy_preferences", table: "user_privacy_preferences", userColumn: "user_id", optional: true },
  { key: "legacy_privacy_preferences", table: "privacy_preferences", userColumn: "user_id", optional: true },
  { key: "subscriptions", table: "subscriptions", userColumn: "user_id" },
  { key: "training_plans", table: "training_plans", userColumn: "user_id" },
  { key: "workouts", table: "workouts", userColumn: "user_id" },
  { key: "activities", table: "activities", userColumn: "user_id" },
  { key: "checkins", table: "checkins", userColumn: "user_id", optional: true },
  { key: "legacy_check_ins", table: "check_ins", userColumn: "user_id", optional: true },
  { key: "achievements", table: "achievements", userColumn: "user_id", optional: true },
  { key: "data_source_consents", table: "data_source_consents", userColumn: "user_id", optional: true },
  { key: "activity_import_logs", table: "activity_import_logs", userColumn: "user_id", optional: true },
  { key: "shoes", table: "shoes", userColumn: "user_id", optional: true },
  { key: "activity_shoes", table: "activity_shoes", userColumn: "user_id", optional: true },
  { key: "race_strategies", table: "race_strategies", userColumn: "user_id", optional: true },
  { key: "race_readiness_scores", table: "race_readiness_scores", userColumn: "user_id", optional: true },
  { key: "race_checklists", table: "race_checklists", userColumn: "user_id", optional: true },
  { key: "life_mode_requests", table: "life_mode_requests", userColumn: "user_id", optional: true },
  { key: "weekly_adjustments", table: "weekly_adjustments", userColumn: "user_id", optional: true },
  { key: "ai_chat_threads", table: "ai_chat_threads", userColumn: "user_id", optional: true },
  { key: "ai_chat_messages", table: "ai_chat_messages", userColumn: "user_id", optional: true },
  { key: "legacy_ai_conversations", table: "ai_conversations", userColumn: "user_id", optional: true },
  { key: "legacy_ai_messages", table: "ai_messages", userColumn: "user_id", optional: true },
  { key: "ai_analysis_reports", table: "ai_analysis_reports", userColumn: "user_id", optional: true },
  { key: "ai_usage_logs", table: "ai_usage_logs", userColumn: "user_id", optional: true },
  { key: "ai_data_access_logs", table: "ai_data_access_logs", userColumn: "user_id", optional: true },
  { key: "strava_connections", table: "strava_connections", userColumn: "user_id", redactTokens: true, optional: true },
  { key: "strava_activity_cache", table: "strava_activity_cache", userColumn: "user_id", optional: true },
  { key: "garmin_connections", table: "garmin_connections", userColumn: "user_id", redactTokens: true, optional: true },
  { key: "connected_service_audit_logs", table: "connected_service_audit_logs", userColumn: "user_id", optional: true },
  { key: "user_data_export_requests", table: "user_data_export_requests", userColumn: "user_id", optional: true },
  { key: "user_data_deletion_requests", table: "user_data_deletion_requests", userColumn: "user_id", optional: true },
  { key: "legacy_account_deletion_requests", table: "account_deletion_requests", userColumn: "user_id", optional: true }
];

type ExportTable = (typeof exportTables)[number];

function isMissingRelation(error: { code?: string; message?: string }): boolean {
  return error.code === "42P01" || /does not exist|schema cache/i.test(error.message ?? "");
}

function redactConnectionSecrets(rows: unknown): unknown {
  if (!Array.isArray(rows)) {
    return rows;
  }

  return rows.map((row) => {
    if (!row || typeof row !== "object") {
      return row;
    }

    const { access_token_encrypted, refresh_token_encrypted, ...safeRow } = row as Record<string, unknown>;
    return {
      ...safeRow,
      tokens_stored: Boolean(access_token_encrypted || refresh_token_encrypted)
    };
  });
}

async function exportTable(supabase: ReturnType<typeof getServiceClient>, tableConfig: ExportTable, userId: string) {
  const { data, error } = await supabase
    .from(tableConfig.table)
    .select("*")
    .eq(tableConfig.userColumn, userId);

  if (error) {
    if (tableConfig.optional && isMissingRelation(error)) {
      return undefined;
    }

    throw error;
  }

  return tableConfig.redactTokens ? redactConnectionSecrets(data) : data;
}

Deno.serve(async (req) => {
  const optionsResponse = handleOptions(req);
  if (optionsResponse) {
    return optionsResponse;
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return methodNotAllowed();
  }

  try {
    const user = await getAuthenticatedUser(req);
    const supabase = getServiceClient();
    const payload: Record<string, unknown> = {};

    for (const table of exportTables) {
      const data = await exportTable(supabase, table, user.id);
      if (data !== undefined) {
        payload[table.key] = data;
      }
    }

    await supabase.from("user_data_export_requests").insert({
      user_id: user.id,
      export_scope: "full_account",
      status: "completed",
      completed_at: new Date().toISOString()
    });

    return jsonResponse({
      exportedAt: new Date().toISOString(),
      userId: user.id,
      data: payload
    });
  } catch (error) {
    return safeErrorResponse(error, "Export failed");
  }
});
