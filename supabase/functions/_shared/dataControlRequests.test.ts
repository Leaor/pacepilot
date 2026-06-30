import {
  buildDeletionRequestPayload,
  buildExportRequestPayload,
  buildLegacyDeletionRequestPayload,
  buildLegacyExportRequestPayload,
  isMissingColumn,
  normalizeDeletionRequest,
} from "./dataControlRequests.ts";

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

Deno.test("data control requests build modern and legacy export payloads", () => {
  const modern = buildExportRequestPayload(
    "user-1",
    "2026-06-26T00:00:00.000Z",
  );
  const legacy = buildLegacyExportRequestPayload(
    "user-1",
    "2026-06-26T00:00:00.000Z",
  );

  assert(
    modern.export_scope === "full_account",
    "expected modern export scope",
  );
  assert(
    !("requested_categories" in modern),
    "expected modern export payload to omit legacy categories",
  );
  assert(
    Array.isArray(legacy.requested_categories),
    "expected legacy requested categories",
  );
  assert(
    !("export_scope" in legacy),
    "expected legacy export payload to omit export_scope",
  );
});

Deno.test("data control requests build modern and legacy deletion payloads", () => {
  const modern = buildDeletionRequestPayload("user-1");
  const legacy = buildLegacyDeletionRequestPayload("user-1");

  assert(
    modern.deletion_scope === "full_account",
    "expected modern deletion scope",
  );
  assert(
    Array.isArray(legacy.requested_categories),
    "expected legacy requested categories",
  );
  assert(
    legacy.reason === "User requested account deletion",
    "expected legacy reason",
  );
});

Deno.test("data control requests normalize legacy deletion timestamps", () => {
  const normalized = normalizeDeletionRequest({
    id: "request-1",
    created_at: "2026-06-26T00:00:00.000Z",
  }) as Record<
    string,
    unknown
  >;

  assert(
    normalized.requested_at === "2026-06-26T00:00:00.000Z",
    "expected requested_at alias",
  );
});

Deno.test("data control requests detect missing-column errors", () => {
  assert(isMissingColumn({ code: "42703" }), "expected missing-column code");
  assert(
    isMissingColumn({
      message: "Could not find the 'export_scope' column in the schema cache",
    }),
    "expected schema cache miss",
  );
  assert(
    !isMissingColumn({ code: "23505", message: "duplicate key" }),
    "expected unrelated errors to pass through",
  );
});
