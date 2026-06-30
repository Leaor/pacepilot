import { getAuthenticatedUser, getServiceClient } from "../_shared/auth.ts";
import { handleOptions, jsonResponse, methodNotAllowed, safeErrorResponse } from "../_shared/cors.ts";
import { getActiveStravaConnection, refreshStravaAccessToken } from "../_shared/strava.ts";

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
    const connection = await getActiveStravaConnection(supabase, user.id);
    const token = await refreshStravaAccessToken(supabase, connection);

    return jsonResponse({
      refreshed: true,
      athleteId: token.athleteId,
      expiresAt: token.expiresAt
    }, 200, req);
  } catch (error) {
    return safeErrorResponse(error, "Strava token refresh failed", req);
  }
});
