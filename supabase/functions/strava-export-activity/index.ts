import { getAuthenticatedUser, getServiceClient } from "../_shared/auth.ts";
import { handleOptions, jsonResponse, methodNotAllowed, readJsonBody, safeErrorResponse, HttpError } from "../_shared/cors.ts";
import { writeConnectedServiceAuditLog } from "../_shared/audit.ts";
import { getActiveStravaConnection, getValidStravaAccessToken } from "../_shared/strava.ts";

type ExportActivityBody = {
  activityId?: string;
  name?: string;
  description?: string;
  trainer?: boolean;
  commute?: boolean;
};

type ActivityRow = {
  id: string;
  source: string;
  started_at: string;
  distance_km: number | string | null;
  duration_seconds: number | null;
  notes: string | null;
};

function activityName(activity: ActivityRow, override?: string): string {
  const cleanOverride = override?.trim();
  if (cleanOverride) {
    return cleanOverride.slice(0, 80);
  }

  return `PacePilot Run ${new Date(activity.started_at).toISOString().slice(0, 10)}`;
}

function assertExportableActivity(activity: ActivityRow): void {
  if (!["pacepilot_gps", "pacepilot_manual"].includes(activity.source)) {
    throw new HttpError("Only PacePilot-native activities can be exported to Strava", 400);
  }

  if (!activity.duration_seconds || activity.duration_seconds <= 0) {
    throw new HttpError("Activity duration is required for Strava export", 400);
  }
}

async function createStravaActivity(accessToken: string, activity: ActivityRow, body: ExportActivityBody): Promise<Response> {
  const distanceMeters = Math.max(0, Number(activity.distance_km ?? 0) * 1000);
  const params = new URLSearchParams({
    name: activityName(activity, body.name),
    sport_type: "Run",
    type: "Run",
    start_date_local: activity.started_at,
    elapsed_time: String(activity.duration_seconds),
    trainer: body.trainer ? "1" : "0",
    commute: body.commute ? "1" : "0"
  });

  if (distanceMeters > 0) {
    params.set("distance", String(distanceMeters));
  }

  const description = body.description?.trim() || activity.notes?.trim();
  if (description) {
    params.set("description", description.slice(0, 1024));
  }

  return fetch("https://www.strava.com/api/v3/activities", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: params
  });
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
    const body = await readJsonBody<ExportActivityBody>(req);
    if (!body.activityId) {
      throw new HttpError("activityId is required", 400);
    }

    const supabase = getServiceClient();
    const activityResult = await supabase
      .from("activities")
      .select("id,source,started_at,distance_km,duration_seconds,notes")
      .eq("user_id", user.id)
      .eq("id", body.activityId)
      .maybeSingle();

    if (activityResult.error) {
      throw activityResult.error;
    }

    if (!activityResult.data) {
      throw new HttpError("Activity not found", 404);
    }

    const activity = activityResult.data as ActivityRow;
    assertExportableActivity(activity);

    const connection = await getActiveStravaConnection(supabase, user.id);
    let token = await getValidStravaAccessToken(supabase, connection);
    let stravaResponse = await createStravaActivity(token.accessToken, activity, body);

    if (stravaResponse.status === 401) {
      token = await getValidStravaAccessToken(supabase, connection, true);
      stravaResponse = await createStravaActivity(token.accessToken, activity, body);
    }

    const stravaPayload = await stravaResponse.json().catch(() => ({})) as Record<string, unknown>;
    if (!stravaResponse.ok) {
      await writeConnectedServiceAuditLog(supabase, {
        userId: user.id,
        service: "strava",
        action: "activity_export_failed",
        metadata: {
          activity_id: activity.id,
          status: stravaResponse.status
        }
      });
      throw new HttpError("Strava activity export failed", 502);
    }

    await writeConnectedServiceAuditLog(supabase, {
      userId: user.id,
      service: "strava",
      action: "activity_exported",
      metadata: {
        activity_id: activity.id,
        strava_activity_id: stravaPayload.id
      }
    });

    return jsonResponse({
      exported: true,
      stravaActivityId: stravaPayload.id,
      athleteId: token.athleteId
    }, 201);
  } catch (error) {
    return safeErrorResponse(error, "Strava activity export failed");
  }
});
