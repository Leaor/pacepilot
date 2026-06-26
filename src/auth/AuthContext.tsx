import type { Session } from "@supabase/supabase-js";
import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { bootstrapProfile, isSupabaseConfigured, supabase } from "@/lib/supabase";

type AuthContextValue = {
  session: Session | null;
  loading: boolean;
  configured: boolean;
  signInWithPassword: (email: string, password: string) => Promise<string | null>;
  signUpWithPassword: (email: string, password: string) => Promise<string | null>;
  sendMagicLink: (email: string) => Promise<string | null>;
  resetPassword: (email: string) => Promise<string | null>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const configured = isSupabaseConfigured();

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => subscription.unsubscribe();
  }, [configured]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      loading,
      configured,
      async signInWithPassword(email, password) {
        if (!configured) {
          return "Supabase is not configured.";
        }

        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return error?.message ?? null;
      },
      async signUpWithPassword(email, password) {
        if (!configured) {
          return "Supabase is not configured.";
        }

        const { data, error } = await supabase.auth.signUp({ email, password });
        if (data.user) {
          await bootstrapProfile(data.user.id, email);
        }

        return error?.message ?? null;
      },
      async sendMagicLink(email) {
        if (!configured) {
          return "Supabase is not configured.";
        }

        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: "pacepilot://auth/callback"
          }
        });
        return error?.message ?? null;
      },
      async resetPassword(email) {
        if (!configured) {
          return "Supabase is not configured.";
        }

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: "pacepilot://auth/callback"
        });
        return error?.message ?? null;
      },
      async signOut() {
        if (configured) {
          await supabase.auth.signOut();
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
