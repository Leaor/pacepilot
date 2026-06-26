import { authenticatedStub } from "../_shared/stub.ts";

Deno.serve(authenticatedStub("strava-webhook", "Validate Strava webhook events and update display-only cache metadata."));
