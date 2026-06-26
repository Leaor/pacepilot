import { authenticatedStub } from "../_shared/stub.ts";

Deno.serve(authenticatedStub("garmin-export-plan", "Export a training plan to Garmin when terms and user consent permit it."));
