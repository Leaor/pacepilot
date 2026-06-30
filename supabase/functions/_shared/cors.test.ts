import { corsHeadersForRequest, handleOptions, isOriginAllowed, jsonResponse } from "./cors.ts";

const envKeys = ["CORS_ALLOWED_ORIGINS", "ALLOWED_ORIGINS", "APP_ENV", "ENVIRONMENT"] as const;

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

async function withCorsEnv<T>(
  value: string | undefined,
  fn: () => T | Promise<T>,
  options: { appEnv?: string; environment?: string } = {}
): Promise<T> {
  const previous = new Map(envKeys.map((key) => [key, Deno.env.get(key)]));
  for (const key of envKeys) {
    Deno.env.delete(key);
  }

  if (value !== undefined) {
    Deno.env.set("CORS_ALLOWED_ORIGINS", value);
  }
  if (options.appEnv !== undefined) {
    Deno.env.set("APP_ENV", options.appEnv);
  }
  if (options.environment !== undefined) {
    Deno.env.set("ENVIRONMENT", options.environment);
  }

  try {
    return await fn();
  } finally {
    for (const key of envKeys) {
      Deno.env.delete(key);
      const previousValue = previous.get(key);
      if (previousValue !== undefined) {
        Deno.env.set(key, previousValue);
      }
    }
  }
}

Deno.test("CORS defaults to wildcard when no allowlist is configured", () => {
  return withCorsEnv(undefined, () => {
    const headers = corsHeadersForRequest(new Request("https://edge.test", {
      headers: { origin: "https://runner.example" }
    }));

    assert(headers["Access-Control-Allow-Origin"] === "*", "expected wildcard CORS origin");
    assert(isOriginAllowed(new Request("https://edge.test", {
      headers: { origin: "https://runner.example" }
    })), "expected origin to be allowed without allowlist");
  });
});

Deno.test("CORS reflects only configured allowed origins", () => {
  return withCorsEnv("https://app.example.com, https://admin.example.com/settings", () => {
    const allowedRequest = new Request("https://edge.test", {
      headers: { origin: "https://admin.example.com" }
    });
    const deniedRequest = new Request("https://edge.test", {
      headers: { origin: "https://evil.example" }
    });

    assert(isOriginAllowed(allowedRequest), "expected configured origin to be allowed");
    assert(!isOriginAllowed(deniedRequest), "expected unconfigured origin to be denied");
    assert(
      corsHeadersForRequest(allowedRequest)["Access-Control-Allow-Origin"] === "https://admin.example.com",
      "expected reflected allowed origin"
    );
    assert(
      !("Access-Control-Allow-Origin" in corsHeadersForRequest(deniedRequest)),
      "expected denied origin to omit access-control allow origin"
    );
  });
});

Deno.test("CORS fails closed in production when no allowlist is configured", () => {
  return withCorsEnv(undefined, () => {
    const request = new Request("https://edge.test", {
      headers: { origin: "https://runner.example" }
    });

    assert(!isOriginAllowed(request), "expected production origin to be denied without allowlist");
    assert(!("Access-Control-Allow-Origin" in corsHeadersForRequest(request)), "expected no wildcard in production");
  }, { appEnv: "production" });
});

Deno.test("CORS ignores wildcard origins in production", () => {
  return withCorsEnv("*", () => {
    const request = new Request("https://edge.test", {
      headers: { origin: "https://runner.example" }
    });

    assert(!isOriginAllowed(request), "expected production wildcard to be denied");
    assert(!("Access-Control-Allow-Origin" in corsHeadersForRequest(request)), "expected no wildcard header in production");
  }, { environment: "prod" });
});

Deno.test("CORS preflight rejects disallowed origins", async () => {
  await withCorsEnv("https://app.example.com", () => {
    const response = handleOptions(new Request("https://edge.test", {
      method: "OPTIONS",
      headers: { origin: "https://evil.example" }
    }));

    assert(response?.status === 403, "expected disallowed preflight to be rejected");
    if (!response) {
      throw new Error("expected preflight response");
    }
    assert(response.headers.get("Access-Control-Allow-Origin") === null, "expected no CORS allow origin");
  });
});

Deno.test("JSON responses carry request-scoped CORS headers", async () => {
  await withCorsEnv("https://app.example.com", async () => {
    const response = jsonResponse({ ok: true }, 200, new Request("https://edge.test", {
      headers: { origin: "https://app.example.com" }
    }));

    assert(response.headers.get("Access-Control-Allow-Origin") === "https://app.example.com", "expected JSON CORS header");
    assert(await response.json().then((body) => body.ok) === true, "expected JSON body");
  });
});
