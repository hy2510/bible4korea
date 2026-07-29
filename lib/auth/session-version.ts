import type { User } from "@supabase/supabase-js";

const SESSION_VERSION_STORAGE_PREFIX = "bible4korea:session-version:";
export const INITIAL_SESSION_VERSION = 1;

export function normalizeSessionVersion(value: unknown): number {
  return Number.isInteger(value) && Number(value) >= INITIAL_SESSION_VERSION
    ? Number(value)
    : INITIAL_SESSION_VERSION;
}

export function getUserSessionVersion(user: User): number {
  return normalizeSessionVersion(user.app_metadata?.session_version);
}

export function getStoredSessionVersion(userId: string): number | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = window.localStorage.getItem(
      `${SESSION_VERSION_STORAGE_PREFIX}${userId}`,
    );
    if (stored === null) return null;
    return normalizeSessionVersion(Number(stored));
  } catch {
    return null;
  }
}

export function setStoredSessionVersion(
  userId: string,
  version: number,
): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      `${SESSION_VERSION_STORAGE_PREFIX}${userId}`,
      String(normalizeSessionVersion(version)),
    );
  } catch {
    // 저장소에 접근할 수 없어도 Supabase 세션 자체는 유지합니다.
  }
}

export function clearStoredSessionVersion(userId: string): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(
      `${SESSION_VERSION_STORAGE_PREFIX}${userId}`,
    );
  } catch {
    // 저장소에 접근할 수 없어도 로그아웃은 계속 진행합니다.
  }
}
