import "server-only";

import {
  createHash,
  createHmac,
  timingSafeEqual,
} from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_SESSION_COOKIE = "bible4korea_admin_session";
const ADMIN_SESSION_DURATION_SECONDS = 8 * 60 * 60;

interface AdminConfig {
  username: string;
  password: string;
  sessionSecret: string;
}

interface AdminSessionPayload {
  username: string;
  expiresAt: number;
}

function getAdminConfig(): AdminConfig | null {
  const username = process.env.ADMIN_USERNAME?.normalize("NFKC").trim();
  const password = process.env.ADMIN_PASSWORD;
  const sessionSecret =
    process.env.ADMIN_SESSION_SECRET ??
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!username || !password || !sessionSecret) return null;
  return { username, password, sessionSecret };
}

function safeEqual(left: string, right: string): boolean {
  const leftHash = createHash("sha256").update(left).digest();
  const rightHash = createHash("sha256").update(right).digest();
  return timingSafeEqual(leftHash, rightHash);
}

function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function isAdminAuthConfigured(): boolean {
  return getAdminConfig() !== null;
}

export function verifyAdminCredentials(
  username: string,
  password: string,
): boolean {
  const config = getAdminConfig();
  if (!config) return false;

  return (
    safeEqual(username.normalize("NFKC").trim(), config.username) &&
    safeEqual(password, config.password)
  );
}

export function createAdminSessionToken(): string | null {
  const config = getAdminConfig();
  if (!config) return null;

  const session: AdminSessionPayload = {
    username: config.username,
    expiresAt: Date.now() + ADMIN_SESSION_DURATION_SECONDS * 1000,
  };
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${signPayload(payload, config.sessionSecret)}`;
}

export function verifyAdminSessionToken(token: string | undefined): boolean {
  if (!token) return false;

  const config = getAdminConfig();
  if (!config) return false;

  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return false;

  const expectedSignature = signPayload(payload, config.sessionSecret);
  if (!safeEqual(signature, expectedSignature)) return false;

  try {
    const session = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as Partial<AdminSessionPayload>;

    return (
      session.username === config.username &&
      typeof session.expiresAt === "number" &&
      Number.isFinite(session.expiresAt) &&
      session.expiresAt > Date.now()
    );
  } catch {
    return false;
  }
}

export async function hasAdminSession(): Promise<boolean> {
  const cookieStore = await cookies();
  return verifyAdminSessionToken(
    cookieStore.get(ADMIN_SESSION_COOKIE)?.value,
  );
}

export function getAdminSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: ADMIN_SESSION_DURATION_SECONDS,
    priority: "high" as const,
  };
}

export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}
