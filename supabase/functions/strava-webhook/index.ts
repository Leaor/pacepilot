import { getServiceClient } from "../_shared/auth.ts";
import { handleOptions, jsonResponse, methodNotAllowed, readJsonBody, safeErrorResponse, HttpError } from "../_shared/cors.ts";
import { writeConnectedServiceAuditLog } from "../_shared/audit.ts";
import { assertExpectedStravaSubscription, type StravaWebhookEvent } from "../_shared/stravaWebhook.ts";

type StravaConnectionRow = {
  user_id: string;
  athlete_id: string | null;
};

function isMissingRelation(error: { code?: string; message?: string }): boolean {
  return error.code === "42P01" || /does not exist|schema cache/i.test(error.message ?? "");
}

async function upsertActivityCache(
  supabase: ReturnType<typeof getServiceClient>,
  userId: string,
  event: Required<Pick<StravaWebhookEvent, "object_id" | "aspect_type">> & StravaWebhookEvent
) {
  if (event.aspect_type === "delete") {
    const result = await supabase
      .from("strava_activity_cache")
      .delete()
      .eq("user_id", userId)
      .eq("strava_activity_id", String(event.object_id));

    if (result.error && !isMissingRelation(result.error)) {
      throw result.error;
    }
    return;
  }

  const result = await supabase.from("strava_activity_cache").upsert(
    {
      user_id: userId,
      strava_activity_id: String(event.object_id),
      payload: {
        webhook_only: true,
        aspect_type: event.aspect_type,
        event_time: event.event_time,
        updates: event.updates ?? {}
      },
      cached_at: new Date().toISOString()
    },
    { onConflict: "user_id,strava_activity_id" }
  );

  if (result.error && !isMissingRelation(result.error)) {
    throw result.error;
  }
}

Deno.serve(async (req) => {
  const optionsResponse = handleOptions(req);
  if (optionsResponse) {
    return optionsResponse;
  }

  try {
    const url = new URL(req.url);

    if (req.method === "GET") {
      const challenge = url.searchParams.get("hub.challenge");
      const verifyToken = url.searchParams.get("hub.verify_token");
      const expectedToken = Deno.env.get("STRAVA_WEBHOOK_VERIFY_TOKEN");

      if (!challenge || !expectedToken || verifyToken !== expectedToken) {
        throw new HttpError("Webhook verification failed", 403);
      }

      return jsonResponse({ "hub.challenge": challenge }, 200, req);
    }

    if (req.method !== "POST") {
      return methodNotAllowed(req);
    }

    const event = await readJsonBody<StravaWebhookEvent>(req, 16_000);
    if (!event.object_type || !event.object_id || !event.aspect_type || !event.owner_id) {
      throw new HttpError("Invalid Strava webhook event", 400);
    }
    assertExpectedStravaSubscription(event);

    const supabase = getServiceClient();
    const connections = await supabase
      .from("strava_connections")
      .select("user_id,athlete_id")
      .eq("athlete_id", String(event.owner_id))
      .is("disconnected_at", null);

    if (connections.error) {
      throw connections.error;
    }

    const rows = (connections.data ?? []) as StravaConnectionRow[];
    for (const connection of rows) {
      if (event.object_type === "activity") {
        await upsertActivityCache(supabase, connection.user_id, {
          ...event,
          object_id: event.object_id,
          aspect_type: event.aspect_type
        });
      }

      await writeConnectedServiceAuditLog(supabase, {
        userId: connection.user_id,
        service: "strava",
        action: `webhook_${event.object_type}_${event.aspect_type}`,
        metadata: {
          athlete_id: connection.athlete_id,
          object_id: String(event.object_id),
          subscription_id: event.subscription_id
        }
      });
    }

    return jsonResponse({ received: true }, 200, req);
  } catch (error) {
    return safeErrorResponse(error, "Strava webhook failed", req);
  }
});
