export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};

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

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}

export function errorResponse(message = "Request failed", status = 500): Response {
  return jsonResponse({ error: message }, status);
}

export function methodNotAllowed(): Response {
  return errorResponse("Method not allowed", 405);
}

export function safeErrorResponse(error: unknown, fallback = "Request failed"): Response {
  if (error instanceof HttpError) {
    return errorResponse(error.publicMessage, error.status);
  }

  return errorResponse(fallback, 500);
}

export function handleOptions(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
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
