import { getAuthenticatedUser, getServiceClient } from "../_shared/auth.ts";
import { handleOptions, jsonResponse, methodNotAllowed, readJsonBody, safeErrorResponse } from "../_shared/cors.ts";

type ImportRow = {
  name: string;
  city: string;
  region?: string;
  country: "US" | "CA";
  race_date: string;
  distance_km: number;
  terrain_tags: string[];
  vibe_tags: string[];
  featured: boolean;
  import_source: string;
};

const maxRows = 500;

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

function parseBoolean(value: string): boolean {
  return ["1", "true", "yes", "featured"].includes(value.trim().toLowerCase());
}

function parseTagList(value: string): string[] {
  return value
    .split("|")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function assertValidDate(value: string, rowNumber: number): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    throw new Error(`Row ${rowNumber} has an invalid race_date.`);
  }

  return value;
}

function parseRows(csv: string): ImportRow[] {
  const trimmed = csv.trim();
  if (!trimmed) {
    return [];
  }

  const [headerLine, ...lines] = trimmed.split(/\r?\n/);
  const headers = parseCsvLine(headerLine).map((header) => header.trim());
  const rows = lines.filter((line) => line.trim());

  if (rows.length > maxRows) {
    throw new Error(`CSV imports are limited to ${maxRows} rows.`);
  }

  return rows.map((line, index) => {
    const rowNumber = index + 2;
    const values = parseCsvLine(line);
    const row = Object.fromEntries(headers.map((header, valueIndex) => [header, values[valueIndex] ?? ""]));
    const country = row.country?.trim().toUpperCase();
    const distanceKm = Number(row.distance_km);

    if (!row.name?.trim() || !row.city?.trim()) {
      throw new Error(`Row ${rowNumber} is missing a race name or city.`);
    }

    if (country !== "US" && country !== "CA") {
      throw new Error(`Row ${rowNumber} has an unsupported country.`);
    }

    if (!Number.isFinite(distanceKm) || distanceKm <= 0 || distanceKm > 500) {
      throw new Error(`Row ${rowNumber} has an invalid distance_km.`);
    }

    return {
      name: row.name.trim().slice(0, 180),
      city: row.city.trim().slice(0, 120),
      region: row.region?.trim().slice(0, 120) || undefined,
      country,
      race_date: assertValidDate(row.race_date, rowNumber),
      distance_km: distanceKm,
      terrain_tags: parseTagList(row.terrain_tags ?? ""),
      vibe_tags: parseTagList(row.vibe_tags ?? ""),
      featured: parseBoolean(row.featured ?? ""),
      import_source: row.import_source?.trim().slice(0, 80) || "admin_csv"
    };
  });
}

function toLegacyAndNativeRow(row: ImportRow): Record<string, unknown> {
  return {
    name: row.name,
    city: row.city,
    region: row.region,
    country: row.country,
    race_date: row.race_date,
    event_date: row.race_date,
    distance_km: row.distance_km,
    terrain_tags: row.terrain_tags,
    terrain: row.terrain_tags.join(", "),
    vibe_tags: row.vibe_tags,
    vibe: row.vibe_tags.join(", "),
    featured: row.featured,
    import_source: row.import_source
  };
}

function toNativeRow(row: ImportRow): Record<string, unknown> {
  return {
    name: row.name,
    city: row.city,
    region: row.region,
    country: row.country,
    event_date: row.race_date,
    distance_km: row.distance_km,
    terrain: row.terrain_tags.join(", "),
    vibe: row.vibe_tags.join(", "),
    featured: row.featured
  };
}

function toLegacyRow(row: ImportRow): Record<string, unknown> {
  return {
    name: row.name,
    city: row.city,
    region: row.region,
    country: row.country,
    race_date: row.race_date,
    distance_km: row.distance_km,
    terrain_tags: row.terrain_tags,
    vibe_tags: row.vibe_tags,
    featured: row.featured,
    import_source: row.import_source
  };
}

function isMissingColumn(error: { code?: string; message?: string }): boolean {
  return error.code === "42703" || /column .* does not exist|schema cache/i.test(error.message ?? "");
}

async function isAdmin(supabase: ReturnType<typeof getServiceClient>, userId: string): Promise<boolean> {
  const { data: authUser } = await supabase.auth.admin.getUserById(userId);
  const role = authUser.user?.app_metadata?.role;
  if (role === "admin") {
    return true;
  }

  const { data, error } = await supabase.from("event_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (error && !/does not exist|schema cache/i.test(error.message ?? "")) {
    throw error;
  }

  return Boolean(data);
}

async function insertRows(supabase: ReturnType<typeof getServiceClient>, rows: ImportRow[]) {
  const combined = rows.map(toLegacyAndNativeRow);
  let result = await supabase.from("events").insert(combined);

  if (!result.error) {
    return;
  }

  if (!isMissingColumn(result.error)) {
    throw result.error;
  }

  result = await supabase.from("events").insert(rows.map(toNativeRow));
  if (!result.error) {
    return;
  }

  if (!isMissingColumn(result.error)) {
    throw result.error;
  }

  const legacyResult = await supabase.from("events").insert(rows.map(toLegacyRow));
  if (legacyResult.error) {
    throw legacyResult.error;
  }
}

Deno.serve(async (req) => {
  const optionsResponse = handleOptions(req);
  if (optionsResponse) {
    return optionsResponse;
  }

  if (req.method !== "POST") {
    return methodNotAllowed();
  }

  try {
    const user = await getAuthenticatedUser(req);
    const supabase = getServiceClient();

    if (!(await isAdmin(supabase, user.id))) {
      return jsonResponse({ error: "Admin access required" }, 403);
    }

    const body = await readJsonBody<{ csv?: string }>(req, 512_000);
    const rows = parseRows(body.csv ?? "");
    await insertRows(supabase, rows);

    await supabase.from("admin_audit_logs").insert({
      admin_user_id: user.id,
      action: "events_csv_import",
      target_table: "events",
      metadata: { imported: rows.length }
    });

    return jsonResponse({ imported: rows.length });
  } catch (error) {
    return safeErrorResponse(error, "Import failed");
  }
});
