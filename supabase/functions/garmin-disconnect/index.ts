import { authenticatedStub } from "../_shared/stub.ts";

Deno.serve(authenticatedStub("garmin-disconnect", "Disconnect Garmin and write connected-service audit logs."));
