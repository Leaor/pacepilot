import { getAuthenticatedUser, getServiceClient } from "../_shared/auth.ts";
import { handleOptions, jsonResponse, methodNotAllowed, safeErrorResponse } from "../_shared/cors.ts";

function isMissingRelation(error: { code?: string; message?: string }): boolean {
  return error.code === "42P01" || /does not exist|schema cache/i.test(error.message ?? "");
}

Deno.serve(async (req) => {
  const optionsResponse = handleOptions(req);
  if (optionsResponse) {
    return optionsResponse;
  }

  if (req.method !== "POST") {
    return methodNotAllowed();
  }

  try {
    const user = await getAuthenticatedUser(req);
    const supabase = getServiceClient();

    let result = await supabase
      .from("user_data_deletion_requests")
      .insert({
        user_id: user.id,
        deletion_scope: "full_account",
        status: "requested"
      })
      .select("id, requested_at")
      .single();

    if (result.error && isMissingRelation(result.error)) {
      result = await supabase
        .from("account_deletion_requests")
        .insert({
          user_id: user.id,
          status: "requested"
        })
        .select("id, requested_at")
        .single();
    }

    if (result.error) {
      throw result.error;
    }

    await supabase.from("connected_service_audit_logs").insert({
      user_id: user.id,
      service: "account",
      action: "deletion_requested",
      metadata: {}
    });

    return jsonResponse({ request: result.data });
  } catch (error) {
    return safeErrorResponse(error, "Delete request failed");
  }
});
