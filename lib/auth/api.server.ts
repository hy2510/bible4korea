import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { hashClientAddress } from "@/lib/auth/recovery.server";
import type { Database } from "@/lib/supabase/database.types";

type AuthSecurityAction = "signup" | "reset";

export function getClientAddress(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function isAuthActionRateLimited(
  supabase: SupabaseClient<Database>,
  request: Request,
  username: string,
  action: AuthSecurityAction,
): Promise<boolean> {
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const ipHash = hashClientAddress(getClientAddress(request));
  const limit = 5;

  let byIp = supabase
    .from("password_recovery_attempts")
    .select("id", { count: "exact", head: true })
    .eq("action", action)
    .eq("ip_hash", ipHash)
    .gte("created_at", since);

  if (action !== "reset") {
    const { count } = await byIp;
    return (count ?? 0) >= limit;
  }

  byIp = byIp.eq("succeeded", false);
  const [ipResult, usernameResult] = await Promise.all([
    byIp,
    supabase
      .from("password_recovery_attempts")
      .select("id", { count: "exact", head: true })
      .eq("action", action)
      .eq("username", username)
      .eq("succeeded", false)
      .gte("created_at", since),
  ]);

  return (
    (ipResult.count ?? 0) >= limit || (usernameResult.count ?? 0) >= limit
  );
}

export async function recordAuthSecurityEvent(
  supabase: SupabaseClient<Database>,
  request: Request,
  username: string,
  action: AuthSecurityAction,
  succeeded: boolean,
): Promise<void> {
  const { error } = await supabase.from("password_recovery_attempts").insert({
    username,
    action,
    ip_hash: hashClientAddress(getClientAddress(request)),
    succeeded,
  });

  if (!error && Math.random() < 0.01) {
    const retentionStart = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1_000,
    ).toISOString();
    await supabase
      .from("password_recovery_attempts")
      .delete()
      .lt("created_at", retentionStart);
  }
}

export function readJsonObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function readString(
  object: Record<string, unknown>,
  key: string,
): string {
  return typeof object[key] === "string" ? object[key] : "";
}

export function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
): Response {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
