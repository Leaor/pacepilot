import { authenticatedStub } from "../_shared/stub.ts";

Deno.serve(authenticatedStub("strava-callback", "Exchange the OAuth code server-side, store encrypted tokens, and cache display-only activity data."));
