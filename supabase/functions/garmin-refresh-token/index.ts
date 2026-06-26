import { authenticatedStub } from "../_shared/stub.ts";

Deno.serve(authenticatedStub("garmin-refresh-token", "Refresh Garmin credentials server-side when Garmin integration is enabled."));
