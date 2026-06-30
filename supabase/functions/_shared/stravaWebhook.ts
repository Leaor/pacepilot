import { HttpError, isProductionEnvironment } from "./cors.ts";

export type StravaWebhookEvent = {
  object_type?: string;
  object_id?: number | string;
  aspect_type?: "create" | "update" | "delete";
  owner_id?: number | string;
  subscription_id?: number | string;
  event_time?: number;
  updates?: Record<string, unknown>;
};

export function assertExpectedStravaSubscription(
  event: Pick<StravaWebhookEvent, "subscription_id">,
  options: {
    expectedSubscriptionId?: string;
    production?: boolean;
  } = {}
) {
  const expectedSubscriptionId = options.expectedSubscriptionId ?? Deno.env.get("STRAVA_WEBHOOK_SUBSCRIPTION_ID")?.trim();
  const production = options.production ?? isProductionEnvironment();

  if (!expectedSubscriptionId) {
    if (production) {
      throw new HttpError("Webhook subscription is not configured", 500);
    }
    return;
  }

  if (String(event.subscription_id ?? "") !== expectedSubscriptionId) {
    throw new HttpError("Webhook subscription verification failed", 403);
  }
}
