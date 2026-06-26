import { getServiceClient } from "./auth.ts";

type SupabaseClient = ReturnType<typeof getServiceClient>;

type SupabaseError = {
  code?: string;
  message?: string;
};

type ConnectedServiceAuditLog = {
  userId: string;
  service: string;
  action: string;
  metadata?: Record<string, unknown>;
};

type AdminAuditLog = {
  adminUserId: string;
  action: string;
  targetTable?: string;
  targetId?: string;
  targetUserId?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
};

function isMissingColumn(error: SupabaseError): boolean {
  return error.code === "42703" || /column .* does not exist|schema cache/i.test(error.message ?? "");
}

function isMissingRelation(error: SupabaseError): boolean {
  return error.code === "42P01" || /does not exist|schema cache/i.test(error.message ?? "");
}

export async function writeConnectedServiceAuditLog(
  supabase: SupabaseClient,
  { userId, service, action, metadata = {} }: ConnectedServiceAuditLog
): Promise<void> {
  const serviceResult = await supabase.from("connected_service_audit_logs").insert({
    user_id: userId,
    service,
    action,
    metadata
  });

  if (!serviceResult.error) {
    return;
  }

  if (isMissingRelation(serviceResult.error)) {
    return;
  }

  if (!isMissingColumn(serviceResult.error)) {
    throw serviceResult.error;
  }

  const providerResult = await supabase.from("connected_service_audit_logs").insert({
    user_id: userId,
    provider: service,
    action,
    metadata
  });

  if (providerResult.error && !isMissingRelation(providerResult.error)) {
    throw providerResult.error;
  }
}

export async function writeAdminAuditLog(
  supabase: SupabaseClient,
  { adminUserId, action, targetTable, targetId, targetUserId, reason, metadata = {} }: AdminAuditLog
): Promise<void> {
  const nativeResult = await supabase.from("admin_audit_logs").insert({
    admin_user_id: adminUserId,
    action,
    target_table: targetTable,
    target_id: targetId,
    metadata
  });

  if (!nativeResult.error) {
    return;
  }

  if (isMissingRelation(nativeResult.error)) {
    return;
  }

  if (!isMissingColumn(nativeResult.error)) {
    throw nativeResult.error;
  }

  const legacyResult = await supabase.from("admin_audit_logs").insert({
    admin_user_id: adminUserId,
    target_user_id: targetUserId,
    action,
    reason,
    metadata: {
      ...metadata,
      target_table: targetTable,
      target_id: targetId
    }
  });

  if (legacyResult.error && !isMissingRelation(legacyResult.error)) {
    throw legacyResult.error;
  }
}
