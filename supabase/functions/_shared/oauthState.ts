import { HttpError } from "./cors.ts";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
const maxStateAgeSeconds = 10 * 60;

type OAuthStatePayload = {
  sub: string;
  iat: number;
  nonce: string;
};

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function base64UrlDecode(value: string): Uint8Array {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

async function getSigningKey(): Promise<CryptoKey> {
  const secret = Deno.env.get("OAUTH_STATE_SECRET") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!secret) {
    throw new Error("Missing OAuth state signing secret");
  }

  return crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function createOAuthState(userId: string): Promise<string> {
  const payload: OAuthStatePayload = {
    sub: userId,
    iat: Math.floor(Date.now() / 1_000),
    nonce: crypto.randomUUID()
  };
  const encodedPayload = base64UrlEncode(textEncoder.encode(JSON.stringify(payload)));
  const key = await getSigningKey();
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, textEncoder.encode(encodedPayload)));

  return `${encodedPayload}.${base64UrlEncode(signature)}`;
}

export async function verifyOAuthState(state: string | null): Promise<OAuthStatePayload> {
  if (!state) {
    throw new HttpError("Invalid OAuth state", 400);
  }

  const [encodedPayload, encodedSignature] = state.split(".");
  if (!encodedPayload || !encodedSignature) {
    throw new HttpError("Invalid OAuth state", 400);
  }

  const key = await getSigningKey();
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    base64UrlDecode(encodedSignature),
    textEncoder.encode(encodedPayload)
  );

  if (!valid) {
    throw new HttpError("Invalid OAuth state", 400);
  }

  const payload = JSON.parse(textDecoder.decode(base64UrlDecode(encodedPayload))) as OAuthStatePayload;
  const now = Math.floor(Date.now() / 1_000);

  if (!payload.sub || !payload.nonce || !payload.iat || now - payload.iat > maxStateAgeSeconds) {
    throw new HttpError("OAuth state expired", 400);
  }

  return payload;
}
