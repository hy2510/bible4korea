"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import {
  clearStoredSessionVersion,
  getUserSessionVersion,
  normalizeSessionVersion,
  setStoredSessionVersion,
} from "@/lib/auth/session-version";
import {
  clearLastReadChapters,
  getLastReadChapters,
  mergeLastReadChapters,
  replaceLastReadChapters,
  subscribeToLastReadChapters,
} from "@/lib/last-read";
import {
  clearPronunciationProgress,
  getPronunciationProgressSnapshot,
  mergePronunciationProgress,
  replacePronunciationProgress,
  serializePronunciationProgressSnapshot,
  subscribeToPronunciationProgress,
} from "@/lib/pronunciation-progress";
import {
  getSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import type { Json } from "@/lib/supabase/database.types";

type SyncStatus = "idle" | "syncing" | "synced" | "error";
const SESSION_VALIDATION_INTERVAL_MS = 5 * 60_000;

interface AuthContextValue {
  user: User | null;
  username: string | null;
  loading: boolean;
  configured: boolean;
  syncStatus: SyncStatus;
  signOut: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [supabase] = useState(() => getSupabaseBrowserClient());
  const configured = isSupabaseConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(configured);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const previousUserIdRef = useRef<string | null>(null);
  const userId = user?.id ?? null;
  const username =
    typeof user?.user_metadata?.username === "string"
      ? user.user_metadata.username
      : null;

  useEffect(() => {
    if (!supabase) return;

    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      previousUserIdRef.current = data.session?.user?.id ?? null;
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const nextUser = session?.user ?? null;
      const signedOutUserId = previousUserIdRef.current;
      previousUserIdRef.current = nextUser?.id ?? null;

      if (event === "SIGNED_IN" && nextUser) {
        setStoredSessionVersion(
          nextUser.id,
          getUserSessionVersion(nextUser),
        );
      }

      setUser(nextUser);
      setLoading(false);

      if (event === "SIGNED_OUT" && signedOutUserId) {
        setSyncStatus("idle");
        clearStoredSessionVersion(signedOutUserId);
        clearLastReadChapters();
        clearPronunciationProgress();
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!supabase || !userId || !user) return;

    let active = true;
    let validating = false;

    const validateSession = async () => {
      if (!active || validating) return;
      validating = true;

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!active || !session) return;

        const tokenVersion = getUserSessionVersion(session.user);
        setStoredSessionVersion(userId, tokenVersion);

        const response = await fetch("/api/auth/session-version", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          cache: "no-store",
        });
        if (!active) return;

        if (response.status === 401) {
          await supabase.auth.signOut({ scope: "local" });
          return;
        }
        if (!response.ok) return;

        const data = (await response.json()) as {
          valid?: boolean;
          version?: unknown;
        };
        const currentVersion = normalizeSessionVersion(data.version);
        if (data.valid !== true || currentVersion !== tokenVersion) {
          await supabase.auth.signOut({ scope: "local" });
        }
      } catch {
        // 일시적인 네트워크 오류만으로 사용자를 로그아웃시키지 않습니다.
      } finally {
        validating = false;
      }
    };

    const handleFocus = () => {
      void validateSession();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void validateSession();
      }
    };

    void validateSession();
    const intervalId = window.setInterval(
      () => void validateSession(),
      SESSION_VALIDATION_INTERVAL_MS,
    );
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
    };
  }, [supabase, user, userId]);

  useEffect(() => {
    if (!supabase || !userId) return;

    let active = true;
    let unsubscribeViewed = () => {};
    let unsubscribeReading = () => {};
    let viewedTimer: number | null = null;
    let readingTimer: number | null = null;

    const setStatusIfActive = (status: SyncStatus) => {
      if (active) setSyncStatus(status);
    };

    const upsertViewedHistory = async () => {
      setStatusIfActive("syncing");
      const { error } = await supabase.from("user_viewed_history").upsert(
        {
          user_id: userId,
          entries: toJson(getLastReadChapters()),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
      setStatusIfActive(error ? "error" : "synced");
    };

    const upsertReadingProgress = async () => {
      setStatusIfActive("syncing");
      const progress = serializePronunciationProgressSnapshot(
        getPronunciationProgressSnapshot(),
      );
      const { error } = await supabase.from("user_reading_progress").upsert(
        {
          user_id: userId,
          progress: toJson(progress),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
      setStatusIfActive(error ? "error" : "synced");
    };

    const queueViewedSync = () => {
      if (viewedTimer !== null) window.clearTimeout(viewedTimer);
      viewedTimer = window.setTimeout(() => {
        void upsertViewedHistory();
      }, 400);
    };

    const queueReadingSync = () => {
      if (readingTimer !== null) window.clearTimeout(readingTimer);
      readingTimer = window.setTimeout(() => {
        void upsertReadingProgress();
      }, 400);
    };

    const initializeSync = async () => {
      await Promise.resolve();
      setStatusIfActive("syncing");

      const [viewedResult, readingResult] = await Promise.all([
        supabase
          .from("user_viewed_history")
          .select("entries")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("user_reading_progress")
          .select("progress")
          .eq("user_id", userId)
          .maybeSingle(),
      ]);

      if (!active) return;
      if (viewedResult.error || readingResult.error) {
        setSyncStatus("error");
        return;
      }

      const mergedViewed = mergeLastReadChapters(
        getLastReadChapters(),
        viewedResult.data?.entries,
      );
      const mergedReading = mergePronunciationProgress(
        serializePronunciationProgressSnapshot(
          getPronunciationProgressSnapshot(),
        ),
        readingResult.data?.progress,
      );

      replaceLastReadChapters(mergedViewed);
      replacePronunciationProgress(
        serializePronunciationProgressSnapshot(mergedReading),
      );

      const syncedAt = new Date().toISOString();
      const [viewedUpsert, readingUpsert] = await Promise.all([
        supabase.from("user_viewed_history").upsert(
          {
            user_id: userId,
            entries: toJson(mergedViewed),
            updated_at: syncedAt,
          },
          { onConflict: "user_id" },
        ),
        supabase.from("user_reading_progress").upsert(
          {
            user_id: userId,
            progress: toJson(
              serializePronunciationProgressSnapshot(mergedReading),
            ),
            updated_at: syncedAt,
          },
          { onConflict: "user_id" },
        ),
      ]);

      if (!active) return;
      if (viewedUpsert.error || readingUpsert.error) {
        setSyncStatus("error");
        return;
      }

      unsubscribeViewed = subscribeToLastReadChapters(queueViewedSync);
      unsubscribeReading =
        subscribeToPronunciationProgress(queueReadingSync);
      setSyncStatus("synced");
    };

    void initializeSync();

    return () => {
      active = false;
      unsubscribeViewed();
      unsubscribeReading();
      if (viewedTimer !== null) window.clearTimeout(viewedTimer);
      if (readingTimer !== null) window.clearTimeout(readingTimer);
    };
  }, [supabase, userId]);

  const signOut = async () => {
    if (!supabase) return "로그아웃을 사용할 수 없습니다.";

    const { error } = await supabase.auth.signOut({ scope: "local" });
    return error ? "로그아웃하지 못했습니다. 다시 시도해 주세요." : null;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        username,
        loading,
        configured,
        syncStatus,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
