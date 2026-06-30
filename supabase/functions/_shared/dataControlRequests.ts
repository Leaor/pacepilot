const fullAccountScope = "full_account";

type DbError = {
  code?: string;
  message?: string;
};

export function isMissingColumn(error: DbError | null | undefined): boolean {
  return error?.code === "42703" ||
    /column .* does not exist|schema cache/i.test(error?.message ?? "");
}

export function buildExportRequestPayload(
  userId: string,
  completedAt: string,
): Record<string, unknown> {
  return {
    user_id: userId,
    export_scope: fullAccountScope,
    status: "completed",
    completed_at: completedAt,
  };
}

export function buildLegacyExportRequestPayload(
  userId: string,
  completedAt: string,
): Record<string, unknown> {
  return {
    user_id: userId,
    status: "completed",
    requested_categories: [fullAccountScope],
    completed_at: completedAt,
  };
}

export function buildDeletionRequestPayload(
  userId: string,
): Record<string, unknown> {
  return {
    user_id: userId,
    deletion_scope: fullAccountScope,
    status: "requested",
  };
}

export function buildLegacyDeletionRequestPayload(
  userId: string,
): Record<string, unknown> {
  return {
    user_id: userId,
    status: "requested",
    requested_categories: [fullAccountScope],
    reason: "User requested account deletion",
  };
}

export function normalizeDeletionRequest(data: unknown): unknown {
  if (!data || typeof data !== "object") {
    return data;
  }

  const record = data as Record<string, unknown>;
  if (record.requested_at || !record.created_at) {
    return record;
  }

  return {
    ...record,
    requested_at: record.created_at,
  };
}
