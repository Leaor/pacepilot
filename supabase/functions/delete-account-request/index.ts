import { getAuthenticatedUser, getServiceClient } from "../_shared/auth.ts";
import {
  handleOptions,
  jsonResponse,
  methodNotAllowed,
  safeErrorResponse,
} from "../_shared/cors.ts";
import { writeConnectedServiceAuditLog } from "../_shared/audit.ts";
import {
  buildDeletionRequestPayload,
  buildLegacyDeletionRequestPayload,
  isMissingColumn,
  normalizeDeletionRequest,
} from "../_shared/dataControlRequests.ts";

function isMissingRelation(
  error: { code?: string; message?: string },
): boolean {
  return error.code === "42P01" ||
    /does not exist|schema cache/i.test(error.message ?? "");
}

async function createDeletionRequest(
  supabase: ReturnType<typeof getServiceClient>,
  userId: string,
) {
  let result = await supabase
    .from("user_data_deletion_requests")
    .insert(buildDeletionRequestPayload(userId))
    .select("id, requested_at")
    .single();

  if (result.error && isMissingColumn(result.error)) {
    result = await supabase
      .from("user_data_deletion_requests")
      .insert(buildLegacyDeletionRequestPayload(userId))
      .select("id, created_at")
      .single();
  }

  if (result.error && isMissingRelation(result.error)) {
    result = await supabase
      .from("account_deletion_requests")
      .insert({
        user_id: userId,
        status: "requested",
      })
      .select("id, requested_at")
      .single();
  }

  if (result.error) {
    throw result.error;
  }

  return normalizeDeletionRequest(result.data);
}

Deno.serve(async (req) => {
  const optionsResponse = handleOptions(req);
  if (optionsResponse) {
    return optionsResponse;
  }

  if (req.method !== "POST") {
    return methodNotAllowed(req);
  }

  try {
    const user = await getAuthenticatedUser(req);
    const supabase = getServiceClient();
    const request = await createDeletionRequest(supabase, user.id);

    await writeConnectedServiceAuditLog(supabase, {
      userId: user.id,
      service: "account",
      action: "deletion_requested",
      metadata: {},
    });

    return jsonResponse({ request }, 200, req);
  } catch (error) {
    return safeErrorResponse(error, "Delete request failed", req);
  }
});
