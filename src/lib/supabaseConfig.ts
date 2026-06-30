export type SupabasePublicConfig = {
  url: string;
  anonKey: string;
  configured: boolean;
};

const placeholderKeys = new Set(["not-configured", "placeholder-anon-key"]);
const placeholderHosts = new Set(["pacepilot-not-configured.invalid", "pacepilot-placeholder.supabase.co"]);

function isLocalSupabaseHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function isUsableSupabaseUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl.trim());
    if (placeholderHosts.has(url.hostname)) {
      return false;
    }

    if (url.protocol === "https:") {
      return true;
    }

    return url.protocol === "http:" && isLocalSupabaseHost(url.hostname);
  } catch {
    return false;
  }
}

export function isUsableSupabaseAnonKey(rawKey: string): boolean {
  const anonKey = rawKey.trim();
  return anonKey.length >= 20 && !placeholderKeys.has(anonKey);
}

export function readSupabasePublicConfig(rawUrl = "", rawAnonKey = ""): SupabasePublicConfig {
  const url = rawUrl.trim();
  const anonKey = rawAnonKey.trim();

  return {
    url,
    anonKey,
    configured: isUsableSupabaseUrl(url) && isUsableSupabaseAnonKey(anonKey)
  };
}
