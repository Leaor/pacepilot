const defaultAllowedMethods = "GET, POST, OPTIONS";
const defaultAllowedHeaders = "authorization, x-client-info, apikey, content-type";

function normalizeOrigin(origin: string): string | null {
  const trimmed = origin.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed === "*") {
    return "*";
  }

  try {
    return new URL(trimmed).origin;
  } catch {
    return null;
  }
}

function allowedOrigins(): string[] {
  const raw = Deno.env.get("CORS_ALLOWED_ORIGINS") ?? Deno.env.get("ALLOWED_ORIGINS") ?? "";
  return raw
    .split(",")
    .map((origin) => normalizeOrigin(origin))
    .filter((origin): origin is string => Boolean(origin));
}

export function isProductionEnvironment(): boolean {
  const raw = Deno.env.get("APP_ENV") ?? Deno.env.get("ENVIRONMENT") ?? "";
  const normalized = raw.trim().toLowerCase();
  return normalized === "production" || normalized === "prod";
}

export function isOriginAllowed(req?: Request): boolean {
  const requestOrigin = req?.headers.get("origin");
  if (!requestOrigin) {
    return true;
  }

  const normalizedRequestOrigin = normalizeOrigin(requestOrigin);
  if (!normalizedRequestOrigin) {
    return false;
  }

  const origins = allowedOrigins();
  if (isProductionEnvironment()) {
    return origins.includes(normalizedRequestOrigin);
  }

  return origins.length === 0 || origins.includes("*") || origins.includes(normalizedRequestOrigin);
}

export function corsHeadersForRequest(req?: Request): Record<string, string> {
  const origins = allowedOrigins();
  const requestOrigin = normalizeOrigin(req?.headers.get("origin") ?? "");
  const wildcardAllowed = !isProductionEnvironment() && (origins.length === 0 || origins.includes("*"));
  const allowedOrigin = wildcardAllowed ? "*" : requestOrigin && origins.includes(requestOrigin) ? requestOrigin : "";

  return {
    ...(allowedOrigin ? { "Access-Control-Allow-Origin": allowedOrigin } : {}),
    "Access-Control-Allow-Headers": defaultAllowedHeaders,
    "Access-Control-Allow-Methods": defaultAllowedMethods,
    "Access-Control-Max-Age": "86400",
    Vary: "Origin"
  };
}

export class HttpError extends Error {
  status: number;
  publicMessage: string;

  constructor(publicMessage: string, status = 400) {
    super(publicMessage);
    this.name = "HttpError";
    this.status = status;
    this.publicMessage = publicMessage;
  }
}

export function jsonResponse(body: unknown, status = 200, req?: Request): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeadersForRequest(req),
      "Content-Type": "application/json"
    }
  });
}

export function errorResponse(message = "Request failed", status = 500, req?: Request): Response {
  return jsonResponse({ error: message }, status, req);
}

export function methodNotAllowed(req?: Request): Response {
  return errorResponse("Method not allowed", 405, req);
}

export function safeErrorResponse(error: unknown, fallback = "Request failed", req?: Request): Response {
  if (error instanceof HttpError) {
    return errorResponse(error.publicMessage, error.status, req);
  }

  return errorResponse(fallback, 500, req);
}

export function handleOptions(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    if (!isOriginAllowed(req)) {
      return new Response("Origin not allowed", {
        status: 403,
        headers: corsHeadersForRequest(req)
      });
    }

    return new Response("ok", { headers: corsHeadersForRequest(req) });
  }

  return null;
}

export async function readJsonBody<T = Record<string, unknown>>(req: Request, maxBytes = 64_000): Promise<T> {
  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new HttpError("Request body is too large", 413);
  }

  const text = await req.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) {
    throw new HttpError("Request body is too large", 413);
  }

  if (!text.trim()) {
    return {} as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new HttpError("Request body must be valid JSON", 400);
  }
}
