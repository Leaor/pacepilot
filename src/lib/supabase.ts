import "react-native-url-polyfill/auto";

import { createClient } from "@supabase/supabase-js";
import { supabaseAuthStorage } from "@/lib/supabaseAuthStorage";
import { readSupabasePublicConfig } from "@/lib/supabaseConfig";
import { SUPABASE_TABLES } from "@/lib/supabaseTables";

const supabaseConfig = readSupabasePublicConfig(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);
const configured = supabaseConfig.configured;
const fallbackSupabaseUrl = "https://pacepilot-not-configured.invalid";
const fallbackSupabaseAnonKey = "not-configured";

export const supabase = createClient(
  configured ? supabaseConfig.url : fallbackSupabaseUrl,
  configured ? supabaseConfig.anonKey : fallbackSupabaseAnonKey,
  {
    auth: {
      storage: supabaseAuthStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: "pkce"
    }
  }
);

export function isSupabaseConfigured(): boolean {
  return configured;
}

type SupabaseMutationResult = {
  error: { message?: string } | null;
};

function assertBootstrapSucceeded(result: SupabaseMutationResult, entity: string): void {
  if (result.error) {
    throw new Error(`Unable to initialize ${entity}.`);
  }
}

export async function bootstrapProfile(userId: string, email?: string): Promise<void> {
  const profileResult = await supabase.from(SUPABASE_TABLES.profiles).upsert({
    id: userId,
    email,
    updated_at: new Date().toISOString()
  });
  assertBootstrapSucceeded(profileResult, "profile");

  const privacyResult = await supabase.from(SUPABASE_TABLES.privacyPreferences).upsert({
    user_id: userId,
    updated_at: new Date().toISOString()
  });
  assertBootstrapSucceeded(privacyResult, "privacy preferences");
}
