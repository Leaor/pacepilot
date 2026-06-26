import { getServiceClient } from "./auth.ts";
import { HttpError } from "./cors.ts";
import { decryptSecret, encryptSecret } from "./encryption.ts";
import { writeConnectedServiceAuditLog } from "./audit.ts";

type SupabaseClient = ReturnType<typeof getServiceClient>;

export type StravaConnection = {
  id: string;
  user_id: string;
  athlete_id: string | null;
  access_token_encrypted: string | null;
  refresh_token_encrypted: string | null;
  expires_at: string | null;
};

type StravaTokenPayload = {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  athlete?: {
    id?: number | string;
  };
};

function tokenExpiresSoon(expiresAt: string | null): boolean {
  if (!expiresAt) {
    return true;
  }

  return Date.parse(expiresAt) <= Date.now() + 120_000;
}

function tokenExpiryIso(expiresAt: unknown): string | null {
  if (typeof expiresAt !== "number" || !Number.isFinite(expiresAt)) {
    return null;
  }

  return new Date(expiresAt * 1000).toISOString();
}

export async function getActiveStravaConnection(
  supabase: SupabaseClient,
  userId: string
): Promise<StravaConnection> {
  const { data, error } = await supabase
    .from("strava_connections")
    .select("id,user_id,athlete_id,access_token_encrypted,refresh_token_encrypted,expires_at")
    .eq("user_id", userId)
    .is("disconnected_at", null)
    .order("connected_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new HttpError("No active Strava connection", 404);
  }

  return data as StravaConnection;
}

export async function refreshStravaAccessToken(
  supabase: SupabaseClient,
  connection: StravaConnection
): Promise<{ accessToken: string; expiresAt: string | null; athleteId: string | null }> {
  const clientId = Deno.env.get("STRAVA_CLIENT_ID");
  const clientSecret = Deno.env.get("STRAVA_CLIENT_SECRET");
  const refreshToken = await decryptSecret(connection.refresh_token_encrypted);

  if (!clientId || !clientSecret) {
    throw new Error("Missing Strava OAuth environment variables");
  }

  if (!refreshToken) {
    throw new HttpError("Strava connection needs to be reconnected", 409);
  }

  const response = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken
    })
  });

  const payload = await response.json().catch(() => ({})) as StravaTokenPayload;
  if (!response.ok || typeof payload.access_token !== "string") {
    await writeConnectedServiceAuditLog(supabase, {
      userId: connection.user_id,
      service: "strava",
      action: "token_refresh_failed",
      metadata: {
        athlete_id: connection.athlete_id,
        status: response.status
      }
    });
    throw new HttpError("Strava token refresh failed", 502);
  }

  const expiresAt = tokenExpiryIso(payload.expires_at);
  const athleteId = String(payload.athlete?.id ?? connection.athlete_id ?? "");
  const update = await supabase
    .from("strava_connections")
    .update({
      athlete_id: athleteId || connection.athlete_id,
      access_token_encrypted: await encryptSecret(payload.access_token),
      refresh_token_encrypted: await encryptSecret(payload.refresh_token ?? refreshToken),
      expires_at: expiresAt
    })
    .eq("id", connection.id);

  if (update.error) {
    throw update.error;
  }

  await writeConnectedServiceAuditLog(supabase, {
    userId: connection.user_id,
    service: "strava",
    action: "token_refreshed",
    metadata: {
      athlete_id: athleteId || connection.athlete_id,
      expires_at: expiresAt
    }
  });

  return {
    accessToken: payload.access_token,
    expiresAt,
    athleteId: athleteId || connection.athlete_id
  };
}

export async function getValidStravaAccessToken(
  supabase: SupabaseClient,
  connection: StravaConnection,
  forceRefresh = false
): Promise<{ accessToken: string; expiresAt: string | null; athleteId: string | null }> {
  const accessToken = await decryptSecret(connection.access_token_encrypted);

  if (!forceRefresh && accessToken && !tokenExpiresSoon(connection.expires_at)) {
    return {
      accessToken,
      expiresAt: connection.expires_at,
      athleteId: connection.athlete_id
    };
  }

  return refreshStravaAccessToken(supabase, connection);
}
