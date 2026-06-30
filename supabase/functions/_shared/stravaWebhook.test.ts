import { HttpError } from "./cors.ts";
import { assertExpectedStravaSubscription } from "./stravaWebhook.ts";

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function assertHttpError(fn: () => void, status: number, message: string): void {
  try {
    fn();
  } catch (error) {
    if (!(error instanceof HttpError)) {
      throw new Error("expected HttpError");
    }
    assert(error.status === status, `expected status ${status}`);
    assert(error.publicMessage === message, `expected message ${message}`);
    return;
  }

  throw new Error("expected function to throw");
}

Deno.test("Strava webhook subscription check allows unconfigured development", () => {
  assertExpectedStravaSubscription({ subscription_id: "unexpected" }, {
    expectedSubscriptionId: "",
    production: false
  });
});

Deno.test("Strava webhook subscription check fails closed in production", () => {
  assertHttpError(
    () =>
      assertExpectedStravaSubscription({ subscription_id: "unexpected" }, {
        expectedSubscriptionId: "",
        production: true
      }),
    500,
    "Webhook subscription is not configured"
  );
});

Deno.test("Strava webhook subscription check accepts the configured subscription", () => {
  assertExpectedStravaSubscription({ subscription_id: 12345 }, {
    expectedSubscriptionId: "12345",
    production: true
  });
});

Deno.test("Strava webhook subscription check rejects mismatched subscriptions", () => {
  assertHttpError(
    () =>
      assertExpectedStravaSubscription({ subscription_id: "other" }, {
        expectedSubscriptionId: "expected",
        production: true
      }),
    403,
    "Webhook subscription verification failed"
  );
});
