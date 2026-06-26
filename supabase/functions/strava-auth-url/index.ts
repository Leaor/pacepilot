import { getAuthenticatedUser } from "../_shared/auth.ts";
import { handleOptions, jsonResponse, methodNotAllowed, safeErrorResponse } from "../_shared/cors.ts";
import { createOAuthState } from "../_shared/oauthState.ts";

Deno.serve(async (req) => {
  const optionsResponse = handleOptions(req);
  if (optionsResponse) {
    return optionsResponse;
  }

  if (req.method !== "GET") {
    return methodNotAllowed();
  }

  try {
    const user = await getAuthenticatedUser(req);
    const clientId = Deno.env.get("STRAVA_CLIENT_ID");
    const redirectUri = Deno.env.get("STRAVA_REDIRECT_URI");

    if (!clientId || !redirectUri) {
      throw new Error("Missing Strava OAuth environment variables");
    }

    const url = new URL("https://www.strava.com/oauth/mobile/authorize");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("approval_prompt", "auto");
    url.searchParams.set("scope", "read,activity:read");
    url.searchParams.set("state", await createOAuthState(user.id));

    return jsonResponse({ authorizationUrl: url.toString() });
  } catch (error) {
    return safeErrorResponse(error, "Strava OAuth start failed");
  }
});
