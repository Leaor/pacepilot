import { authenticatedStub } from "../_shared/stub.ts";

Deno.serve(authenticatedStub("garmin-callback", "Store Garmin tokens server-side only after approved OAuth exchange."));
