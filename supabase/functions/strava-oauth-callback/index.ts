import { getServiceClient } from "../_shared/auth.ts";
import { handleOptions, jsonResponse, methodNotAllowed, safeErrorResponse } from "../_shared/cors.ts";
import { encryptSecret } from "../_shared/encryption.ts";
import { verifyOAuthState } from "../_shared/oauthState.ts";
import { writeConnectedServiceAuditLog } from "../_shared/audit.ts";

Deno.serve(async (req) => {
  const optionsResponse = handleOptions(req);
  if (optionsResponse) {
    return optionsResponse;
  }

  if (req.method !== "GET") {
    return methodNotAllowed();
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = await verifyOAuthState(url.searchParams.get("state"));
    const clientId = Deno.env.get("STRAVA_CLIENT_ID");
    const clientSecret = Deno.env.get("STRAVA_CLIENT_SECRET");

    if (!code || !clientId || !clientSecret) {
      throw new Error("Missing Strava callback parameters");
    }

    const tokenResponse = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code"
      })
    });
    const tokenPayload = await tokenResponse.json();

    if (!tokenResponse.ok) {
      throw new Error("Strava token exchange failed");
    }

    const supabase = getServiceClient();
    await supabase.from("strava_connections").upsert({
      user_id: state.sub,
      athlete_id: String(tokenPayload.athlete?.id ?? ""),
      access_token_encrypted: await encryptSecret(tokenPayload.access_token),
      refresh_token_encrypted: await encryptSecret(tokenPayload.refresh_token),
      expires_at: new Date(Number(tokenPayload.expires_at) * 1000).toISOString()
    });

    await writeConnectedServiceAuditLog(supabase, {
      userId: state.sub,
      service: "strava",
      action: "connected",
      metadata: {
        athlete_id: String(tokenPayload.athlete?.id ?? ""),
        oauth_state_nonce: state.nonce
      }
    });

    return jsonResponse({ connected: true });
  } catch (error) {
    return safeErrorResponse(error, "Strava OAuth callback failed");
  }
});
