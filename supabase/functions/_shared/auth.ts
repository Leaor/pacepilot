import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { HttpError } from "./cors.ts";

export type AuthenticatedUser = {
  id: string;
  email?: string;
};

export function getServiceClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !serviceRoleKey) {
    throw new Error("Missing Supabase service environment variables");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

export async function getAuthenticatedUser(req: Request): Promise<AuthenticatedUser> {
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const authHeader = req.headers.get("Authorization");

  if (!url || !anonKey || !authHeader) {
    throw new HttpError("Authentication required", 401);
  }

  const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!bearerMatch?.[1]) {
    throw new HttpError("Authentication required", 401);
  }

  const token = bearerMatch[1].trim();
  const supabase = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    },
    global: {
      headers: {
        Authorization: authHeader
      }
    }
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    throw new HttpError("Authentication required", 401);
  }

  return {
    id: data.user.id,
    email: data.user.email
  };
}
