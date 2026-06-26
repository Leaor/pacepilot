import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";
const configured = supabaseUrl.length > 0 && supabaseAnonKey.length > 0;

export const supabase = createClient(
  configured ? supabaseUrl : "https://pacepilot-placeholder.supabase.co",
  configured ? supabaseAnonKey : "placeholder-anon-key",
  {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
  }
);

export function isSupabaseConfigured(): boolean {
  return configured;
}

export async function bootstrapProfile(userId: string, email?: string): Promise<void> {
  await supabase.from("profiles").upsert({
    id: userId,
    email,
    updated_at: new Date().toISOString()
  });

  await supabase.from("privacy_preferences").upsert({
    user_id: userId,
    updated_at: new Date().toISOString()
  });
}
