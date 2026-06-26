import { authenticatedStub } from "../_shared/stub.ts";

Deno.serve(authenticatedStub("strava-disconnect", "Revoke Strava access, clear cached data on request, and write a connected-service audit log."));
