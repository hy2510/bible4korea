"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { authenticatedFetch } from "@/lib/authenticated-fetch";
import { useAuth } from "@/components/AuthProvider";

interface PendingRequestsContextValue {
  pendingCount: number;
  refreshPendingCount: () => Promise<void>;
}

interface PendingCountSnapshot {
  userId: string;
  count: number;
}

const PendingRequestsContext =
  createContext<PendingRequestsContextValue | null>(null);

export function OrganizationPendingRequestsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [snapshot, setSnapshot] = useState<PendingCountSnapshot | null>(
    null,
  );
  const requestSequenceRef = useRef(0);
  const pendingCount =
    snapshot?.userId === userId ? snapshot.count : 0;

  const refreshPendingCount = useCallback(async () => {
    const requestSequence = ++requestSequenceRef.current;
    if (!userId) return;

    try {
      const response = await authenticatedFetch(
        "/api/organizations/pending-count",
        { cache: "no-store" },
      );
      const data = (await response.json().catch(() => null)) as {
        pendingCount?: unknown;
      } | null;
      if (!response.ok) throw new Error("가입 대기 인원 요청 실패");

      const nextCount =
        typeof data?.pendingCount === "number" &&
        Number.isSafeInteger(data.pendingCount) &&
        data.pendingCount >= 0
          ? data.pendingCount
          : 0;
      if (requestSequence !== requestSequenceRef.current) return;
      setSnapshot({ userId, count: nextCount });
    } catch {
      // 일시적인 네트워크 오류에는 기존 알림 수를 유지합니다.
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      requestSequenceRef.current++;
      return;
    }

    const handleFocus = () => {
      void refreshPendingCount();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refreshPendingCount();
      }
    };

    void Promise.resolve().then(refreshPendingCount);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
    };
  }, [refreshPendingCount, userId]);

  return (
    <PendingRequestsContext.Provider
      value={{ pendingCount, refreshPendingCount }}
    >
      {children}
    </PendingRequestsContext.Provider>
  );
}

export function useOrganizationPendingRequests() {
  const context = useContext(PendingRequestsContext);
  if (!context) {
    throw new Error(
      "useOrganizationPendingRequests must be used within OrganizationPendingRequestsProvider",
    );
  }
  return context;
}
