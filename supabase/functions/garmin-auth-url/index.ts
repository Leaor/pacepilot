import { authenticatedStub } from "../_shared/stub.ts";

Deno.serve(authenticatedStub("garmin-auth-url", "Garmin connection is available after partner approval and credentials are configured."));
