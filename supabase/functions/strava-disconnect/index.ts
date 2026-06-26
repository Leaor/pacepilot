import { getAuthenticatedUser, getServiceClient } from "../_shared/auth.ts";
import { handleOptions, jsonResponse, methodNotAllowed, readJsonBody, safeErrorResponse, HttpError } from "../_shared/cors.ts";
import { decryptSecret } from "../_shared/encryption.ts";
import { writeConnectedServiceAuditLog } from "../_shared/audit.ts";
import { getActiveStravaConnection } from "../_shared/strava.ts";

type DisconnectBody = {
  clearCache?: boolean;
  revoke?: boolean;
};

function isMissingRelation(error: { code?: string; message?: string }): boolean {
  return error.code === "42P01" || /does not exist|schema cache/i.test(error.message ?? "");
}

async function deleteOptional(result: PromiseLike<{ error: { code?: string; message?: string } | null }>) {
  const { error } = await result;
  if (error && !isMissingRelation(error)) {
    throw error;
  }
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
    const body = await readJsonBody<DisconnectBody>(req);
    const supabase = getServiceClient();
    const clearCache = body.clearCache !== false;
    const revoke = body.revoke !== false;
    const disconnectedAt = new Date().toISOString();
    let athleteId: string | null = null;
    let revokeStatus: number | null = null;

    try {
      const connection = await getActiveStravaConnection(supabase, user.id);
      athleteId = connection.athlete_id;

      if (revoke) {
        const accessToken = await decryptSecret(connection.access_token_encrypted);
        if (accessToken) {
          const revokeResponse = await fetch("https://www.strava.com/oauth/deauthorize", {
            method: "POST",
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          revokeStatus = revokeResponse.status;
        }
      }
    } catch (error) {
      if (!(error instanceof HttpError && error.status === 404)) {
        throw error;
      }
    }

    const disconnectResult = await supabase
      .from("strava_connections")
      .update({
        access_token_encrypted: null,
        refresh_token_encrypted: null,
        disconnected_at: disconnectedAt
      })
      .eq("user_id", user.id)
      .is("disconnected_at", null);

    if (disconnectResult.error) {
      throw disconnectResult.error;
    }

    if (clearCache) {
      await deleteOptional(supabase.from("strava_activity_cache").delete().eq("user_id", user.id));
      await deleteOptional(supabase.from("activities").delete().eq("user_id", user.id).eq("source", "strava_cache"));
    }

    await writeConnectedServiceAuditLog(supabase, {
      userId: user.id,
      service: "strava",
      action: "disconnected",
      metadata: {
        athlete_id: athleteId,
        cache_cleared: clearCache,
        revoke_requested: revoke,
        revoke_status: revokeStatus
      }
    });

    return jsonResponse({
      disconnected: true,
      cacheCleared: clearCache,
      revokeStatus
    });
  } catch (error) {
    return safeErrorResponse(error, "Strava disconnect failed");
  }
});
