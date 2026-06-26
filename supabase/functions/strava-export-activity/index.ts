import { authenticatedStub } from "../_shared/stub.ts";

Deno.serve(authenticatedStub("strava-export-activity", "Export PacePilot-native activities to Strava where permitted by user consent and platform rules."));
