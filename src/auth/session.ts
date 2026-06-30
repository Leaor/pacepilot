import type { Session } from "@supabase/supabase-js";
import { normalizeEmail } from "@/auth/validation";

type PartialSession = Pick<Session, "access_token" | "user"> | null | undefined;

export type AuthSessionProfile = {
  userId: string;
  email?: string;
};

export function hasUsableAuthSession(session: PartialSession): session is Session {
  return Boolean(
    session &&
      typeof session.access_token === "string" &&
      session.access_token.length > 0 &&
      session.user &&
      typeof session.user.id === "string" &&
      session.user.id.length > 0
  );
}

export function toUsableAuthSession(session: PartialSession): Session | null {
  return hasUsableAuthSession(session) ? session : null;
}

export function getAuthSessionProfile(session: PartialSession, fallbackEmail?: string): AuthSessionProfile | null {
  const usableSession = toUsableAuthSession(session);
  if (!usableSession) {
    return null;
  }

  const sessionEmail = typeof usableSession.user.email === "string" ? normalizeEmail(usableSession.user.email) : "";
  const normalizedFallback = fallbackEmail ? normalizeEmail(fallbackEmail) : "";

  return {
    userId: usableSession.user.id,
    email: sessionEmail || normalizedFallback || undefined
  };
}
