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
  type PronunciationProgressSnapshot,
} from "@/lib/pronunciation-progress";
import {
  fetchNormalizedPronunciationProgress,
  syncNormalizedPronunciationProgress,
} from "@/lib/reading-progress-sync";
import {
  getSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import type { Json } from "@/lib/supabase/database.types";

type SyncStatus = "idle" | "syncing" | "synced" | "error";
const SESSION_VALIDATION_INTERVAL_MS = 30 * 60_000;
const SESSION_VALIDATION_MIN_AGE_MS = 5 * 60_000;

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

function clearSignedOutUserData(userId: string | null) {
  if (!userId) return;

  clearStoredSessionVersion(userId);
  clearLastReadChapters();
  clearPronunciationProgress();
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
        clearSignedOutUserData(signedOutUserId);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!supabase || !userId) return;

    let active = true;
    let validating = false;
    let lastValidatedAt = 0;

    const validateSession = async (force = false) => {
      if (
        !active ||
        validating ||
        (!force &&
          Date.now() - lastValidatedAt < SESSION_VALIDATION_MIN_AGE_MS)
      ) {
        return;
      }
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
        lastValidatedAt = Date.now();
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

    void validateSession(true);
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
  }, [supabase, userId]);

  useEffect(() => {
    if (!supabase || !userId) return;

    let active = true;
    let unsubscribeViewed = () => {};
    let unsubscribeReading = () => {};
    let viewedTimer: number | null = null;
    let readingTimer: number | null = null;
    let lastSyncedReading: PronunciationProgressSnapshot | null = null;
    let readingSyncRunning = false;
    let readingSyncQueued = false;

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

    const flushReadingProgress = async () => {
      if (readingSyncRunning || !lastSyncedReading) return;
      readingSyncRunning = true;

      while (active && readingSyncQueued && lastSyncedReading) {
        readingSyncQueued = false;
        const previous = lastSyncedReading;
        const next = getPronunciationProgressSnapshot();
        setStatusIfActive("syncing");

        try {
          await syncNormalizedPronunciationProgress(
            supabase,
            userId,
            previous,
            next,
          );
          lastSyncedReading = next;
          setStatusIfActive("synced");
        } catch {
          readingSyncQueued = true;
          setStatusIfActive("error");
          break;
        }
      }

      readingSyncRunning = false;
    };

    const queueViewedSync = () => {
      if (viewedTimer !== null) window.clearTimeout(viewedTimer);
      viewedTimer = window.setTimeout(() => {
        void upsertViewedHistory();
      }, 400);
    };

    const queueReadingSync = () => {
      readingSyncQueued = true;
      if (readingTimer !== null) window.clearTimeout(readingTimer);
      readingTimer = window.setTimeout(() => {
        readingTimer = null;
        void flushReadingProgress();
      }, 600);
    };

    const initializeSync = async () => {
      await Promise.resolve();
      setStatusIfActive("syncing");

      try {
        const [viewedResult, remoteReading] = await Promise.all([
          supabase
            .from("user_viewed_history")
            .select("entries")
            .eq("user_id", userId)
            .maybeSingle(),
          fetchNormalizedPronunciationProgress(supabase),
        ]);

        if (!active) return;
        if (viewedResult.error) throw viewedResult.error;

        const remoteViewed = viewedResult.data?.entries ?? [];
        const mergedViewed = mergeLastReadChapters(
          getLastReadChapters(),
          remoteViewed,
        );
        const mergedReading = mergePronunciationProgress(
          serializePronunciationProgressSnapshot(
            getPronunciationProgressSnapshot(),
          ),
          serializePronunciationProgressSnapshot(remoteReading),
        );

        replaceLastReadChapters(mergedViewed);
        replacePronunciationProgress(
          serializePronunciationProgressSnapshot(mergedReading),
        );

        const viewedChanged =
          JSON.stringify(toJson(remoteViewed)) !==
          JSON.stringify(toJson(mergedViewed));
        const syncTasks: PromiseLike<unknown>[] = [
          syncNormalizedPronunciationProgress(
            supabase,
            userId,
            remoteReading,
            mergedReading,
          ),
        ];
        if (viewedChanged) {
          syncTasks.push(
            supabase.from("user_viewed_history").upsert(
              {
                user_id: userId,
                entries: toJson(mergedViewed),
                updated_at: new Date().toISOString(),
              },
              { onConflict: "user_id" },
            ),
          );
        }
        const syncResults = await Promise.all(syncTasks);
        const viewedUpsert = syncResults.at(1) as
          | { error?: unknown }
          | undefined;
        if (viewedUpsert?.error) throw viewedUpsert.error;

        if (!active) return;
        lastSyncedReading = mergedReading;
        unsubscribeViewed = subscribeToLastReadChapters(queueViewedSync);
        unsubscribeReading =
          subscribeToPronunciationProgress(queueReadingSync);
        setSyncStatus("synced");
      } catch {
        if (active) setSyncStatus("error");
      }
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

  const signOut = () => {
    if (!supabase) {
      return Promise.resolve("로그아웃을 사용할 수 없습니다.");
    }

    const signedOutUserId =
      user?.id ?? previousUserIdRef.current;

    previousUserIdRef.current = null;
    setUser(null);
    setLoading(false);
    setSyncStatus("idle");
    clearSignedOutUserData(signedOutUserId);

    void supabase.auth.signOut({ scope: "local" }).catch(() => {
      // UI와 로컬 사용자 데이터는 이미 안전하게 비웠습니다.
      // Supabase는 네트워크 오류가 나도 현재 세션 제거를 시도합니다.
    });

    return Promise.resolve(null);
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
