import type { Session } from "@supabase/supabase-js";
import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  authCallbackFailureMessage,
  authDestinationForRedirectType,
  parseAuthCallbackUrl,
  type AuthCallbackCompletion
} from "@/auth/callback";
import {
  accountServicesUnavailableMessage,
  normalizeEmail,
  profileSetupFailureMessage,
  safeAuthFailureMessage,
  validateEmail,
  validateNewPassword,
  validatePassword
} from "@/auth/validation";
import { getAuthSessionProfile, toUsableAuthSession } from "@/auth/session";
import { bootstrapProfile, isSupabaseConfigured, supabase } from "@/lib/supabase";

type AuthContextValue = {
  session: Session | null;
  loading: boolean;
  configured: boolean;
  signInWithPassword: (email: string, password: string) => Promise<string | null>;
  signUpWithPassword: (email: string, password: string) => Promise<string | null>;
  sendMagicLink: (email: string) => Promise<string | null>;
  resetPassword: (email: string) => Promise<string | null>;
  completeAuthCallback: (callbackUrl: string) => Promise<AuthCallbackCompletion>;
  updatePassword: (password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type SessionActivationResult = "activated" | "missing_session" | "profile_failed" | "cancelled";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const configured = isSupabaseConfigured();

  async function activateSession(
    candidate: Session | null,
    fallbackEmail?: string,
    shouldApply: () => boolean = () => true
  ): Promise<SessionActivationResult> {
    const nextSession = toUsableAuthSession(candidate);
    const profile = getAuthSessionProfile(nextSession, fallbackEmail);

    if (!nextSession || !profile) {
      if (shouldApply()) {
        setSession(null);
      }
      return "missing_session";
    }

    try {
      await bootstrapProfile(profile.userId, profile.email);
    } catch {
      if (shouldApply()) {
        setSession(null);
      }
      return "profile_failed";
    }

    if (!shouldApply()) {
      return "cancelled";
    }

    setSession(nextSession);
    return "activated";
  }

  useEffect(() => {
    let isActive = true;

    if (!configured) {
      setLoading(false);
      return;
    }

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!isActive) return;
        return activateSession(data.session, undefined, () => isActive);
      })
      .catch(() => {
        if (!isActive) return;
        setSession(null);
      })
      .finally(() => {
        if (!isActive) return;
        setLoading(false);
      });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void activateSession(nextSession, undefined, () => isActive);
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, [configured]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      loading,
      configured,
      async signInWithPassword(email, password) {
        if (!configured) {
          return accountServicesUnavailableMessage();
        }

        const normalizedEmail = normalizeEmail(email);
        const validationMessage = validateEmail(normalizedEmail) ?? validatePassword(password);
        if (validationMessage) {
          return validationMessage;
        }

        try {
          const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
          if (error) {
            return safeAuthFailureMessage("signIn");
          }

          const activation = await activateSession(data.session, normalizedEmail);
          if (activation === "missing_session") {
            return safeAuthFailureMessage("signIn");
          }
          return activation === "activated" ? null : profileSetupFailureMessage();
        } catch {
          return safeAuthFailureMessage("signIn");
        }
      },
      async signUpWithPassword(email, password) {
        if (!configured) {
          return accountServicesUnavailableMessage();
        }

        const normalizedEmail = normalizeEmail(email);
        const validationMessage = validateEmail(normalizedEmail) ?? validateNewPassword(password);
        if (validationMessage) {
          return validationMessage;
        }

        let signUpResult: Awaited<ReturnType<typeof supabase.auth.signUp>>;
        try {
          signUpResult = await supabase.auth.signUp({ email: normalizedEmail, password });
        } catch {
          return safeAuthFailureMessage("signUp");
        }

        const { data, error } = signUpResult;
        if (error) {
          return safeAuthFailureMessage("signUp");
        }

        if (!data.user) {
          return safeAuthFailureMessage("signUp");
        }

        if (!toUsableAuthSession(data.session)) {
          return null;
        }

        const activation = await activateSession(data.session, normalizedEmail);
        if (activation === "profile_failed") {
          return "Account created, but profile setup could not be completed. Please sign in and try again.";
        }

        return null;
      },
      async sendMagicLink(email) {
        if (!configured) {
          return accountServicesUnavailableMessage();
        }

        const normalizedEmail = normalizeEmail(email);
        const validationMessage = validateEmail(normalizedEmail);
        if (validationMessage) {
          return validationMessage;
        }

        try {
          const { error } = await supabase.auth.signInWithOtp({
            email: normalizedEmail,
            options: {
              emailRedirectTo: "pacepilot://auth/callback"
            }
          });
          return error ? safeAuthFailureMessage("magicLink") : null;
        } catch {
          return safeAuthFailureMessage("magicLink");
        }
      },
      async resetPassword(email) {
        if (!configured) {
          return accountServicesUnavailableMessage();
        }

        const normalizedEmail = normalizeEmail(email);
        const validationMessage = validateEmail(normalizedEmail);
        if (validationMessage) {
          return validationMessage;
        }

        try {
          const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
            redirectTo: "pacepilot://auth/callback"
          });
          return error ? safeAuthFailureMessage("resetPassword") : null;
        } catch {
          return safeAuthFailureMessage("resetPassword");
        }
      },
      async completeAuthCallback(callbackUrl) {
        if (!configured) {
          return { ok: false, message: accountServicesUnavailableMessage() };
        }

        const parsed = parseAuthCallbackUrl(callbackUrl);
        if (parsed.kind === "error" || parsed.kind === "empty") {
          return { ok: false, message: parsed.message };
        }

        try {
          const { data, error } = parsed.kind === "pkce"
            ? await supabase.auth.exchangeCodeForSession(parsed.code)
            : await supabase.auth.setSession({
              access_token: parsed.accessToken,
              refresh_token: parsed.refreshToken
            });

          if (error) {
            return { ok: false, message: authCallbackFailureMessage };
          }

          const activation = await activateSession(data.session);
          if (activation !== "activated") {
            return { ok: false, message: profileSetupFailureMessage() };
          }

          const callbackData = data as unknown as { redirectType?: unknown };
          const redirectType = typeof callbackData.redirectType === "string"
            ? callbackData.redirectType
            : parsed.redirectType;

          return {
            ok: true,
            destination: authDestinationForRedirectType(redirectType)
          };
        } catch {
          return { ok: false, message: authCallbackFailureMessage };
        }
      },
      async updatePassword(password) {
        if (!configured) {
          return accountServicesUnavailableMessage();
        }

        const validationMessage = validateNewPassword(password);
        if (validationMessage) {
          return validationMessage;
        }

        if (!session) {
          return "Open the latest reset link before setting a new password.";
        }

        try {
          const { error } = await supabase.auth.updateUser({ password });
          return error ? safeAuthFailureMessage("updatePassword") : null;
        } catch {
          return safeAuthFailureMessage("updatePassword");
        }
      },
      async signOut() {
        try {
          if (configured) {
            await supabase.auth.signOut();
          }
        } finally {
          setSession(null);
        }
      }
    }),
    [configured, loading, session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
