import { handleStravaOAuthCallback } from "../_shared/stravaOAuthCallback.ts";

Deno.serve(handleStravaOAuthCallback);
