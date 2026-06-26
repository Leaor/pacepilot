import { authenticatedStub } from "../_shared/stub.ts";

Deno.serve(authenticatedStub("garmin-export-workout", "Export a single workout to Garmin when terms and user consent permit it."));
