import { authenticatedStub } from "../_shared/stub.ts";

Deno.serve(authenticatedStub("strava-refresh-token", "Refresh Strava tokens server-side and respect revocation and rate-limit headers."));
