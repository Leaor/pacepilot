import { authenticatedStub } from "../_shared/stub.ts";

Deno.serve(authenticatedStub("garmin-auth-url", "Garmin OAuth is feature-flagged until developer approval and credentials are available."));
