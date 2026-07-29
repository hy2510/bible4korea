import "server-only";

import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export function getBearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  return authorization.slice("Bearer ".length).trim() || null;
}

export async function getAuthenticatedUser(request: Request): Promise<{
  token: string;
  user: User;
  supabase: SupabaseClient<Database>;
} | null> {
  const token = getBearerToken(request);
  const supabase = getSupabaseAdminClient();
  if (!token || !supabase) return null;

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;

  return { token, user: data.user, supabase };
}

let anonAuthClient: SupabaseClient<Database> | null | undefined;

export function getSupabaseAnonAuthClient(): SupabaseClient<Database> | null {
  if (anonAuthClient !== undefined) return anonAuthClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    anonAuthClient = null;
    return anonAuthClient;
  }

  anonAuthClient = createClient<Database>(url, publishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
  return anonAuthClient;
}
