import { authenticatedStub } from "../_shared/stub.ts";

Deno.serve(authenticatedStub("garmin-webhook", "Handle Garmin webhook payloads after partner approval."));
