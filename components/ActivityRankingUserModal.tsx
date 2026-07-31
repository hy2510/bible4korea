"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  ActivitySummaryContent,
  ActivitySummarySkeleton,
} from "@/components/ActivitySummaryContent";
import { useAuth } from "@/components/AuthProvider";
import { useActivityRankingUserSummary } from "@/components/useActivityRankingUserSummary";
import { authenticatedFetch } from "@/lib/authenticated-fetch";
import type { FriendshipStatusResponse } from "@/lib/user-friends";

interface ActivityRankingUserReference {
  username: string;
  displayName: string;
  affiliation: string | null;
}

const FRIEND_ADDED_FEEDBACK_MS = 1_800;

interface ActivityRankingUserModalProps {
  user: ActivityRankingUserReference;
  onClose: () => void;
  onFriendshipChange?: (isFriend: boolean) => void;
}

export function ActivityRankingUserModal({
  user,
  onClose,
  onFriendshipChange,
}: ActivityRankingUserModalProps) {
  const { username: currentUsername, loading: authLoading } = useAuth();
  const [isFriend, setIsFriend] = useState<boolean | null>(null);
  const [friendPending, setFriendPending] = useState(false);
  const [showFriendAddedFeedback, setShowFriendAddedFeedback] =
    useState(false);
  const [friendError, setFriendError] = useState("");
  const { summary, error } = useActivityRankingUserSummary(user.username);
  const comparisonUsername =
    currentUsername && currentUsername !== user.username
      ? currentUsername
      : null;
  const { summary: currentUserSummary } =
    useActivityRankingUserSummary(comparisonUsername);
  const canManageFriend =
    Boolean(currentUsername) && currentUsername !== user.username;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    if (!canManageFriend) return;

    const controller = new AbortController();
    void authenticatedFetch(
      `/api/friends/${encodeURIComponent(user.username)}`,
      {
        cache: "no-store",
        signal: controller.signal,
      },
    )
      .then(async (response) => {
        const data = (await response.json().catch(() => null)) as
          | FriendshipStatusResponse
          | { message?: string }
          | null;
        if (!response.ok) {
          throw new Error(
            data && "message" in data && data.message
              ? data.message
              : "친구 상태를 확인하지 못했습니다.",
          );
        }
        setIsFriend((data as FriendshipStatusResponse).isFriend);
      })
      .catch((fetchError: unknown) => {
        if (controller.signal.aborted) return;
        setFriendError(
          fetchError instanceof Error
            ? fetchError.message
            : "친구 상태를 확인하지 못했습니다.",
        );
      });

    return () => controller.abort();
  }, [canManageFriend, user.username]);

  useEffect(() => {
    if (!showFriendAddedFeedback) return;

    const timeoutId = window.setTimeout(() => {
      setShowFriendAddedFeedback(false);
    }, FRIEND_ADDED_FEEDBACK_MS);

    return () => window.clearTimeout(timeoutId);
  }, [showFriendAddedFeedback]);

  const updateFriendship = async () => {
    if (isFriend === null || friendPending) return;

    setFriendPending(true);
    setFriendError("");
    const nextIsFriend = !isFriend;

    try {
      const response = await authenticatedFetch(
        `/api/friends/${encodeURIComponent(user.username)}`,
        {
          method: nextIsFriend ? "POST" : "DELETE",
          cache: "no-store",
        },
      );
      const data = (await response.json().catch(() => null)) as
        | FriendshipStatusResponse
        | { message?: string }
        | null;
      if (!response.ok) {
        throw new Error(
            data && "message" in data && data.message
              ? data.message
              : nextIsFriend
              ? "친구로 등록하지 못했습니다."
              : "친구 관계를 해제하지 못했습니다.",
        );
      }

      const updatedIsFriend = (data as FriendshipStatusResponse).isFriend;
      setIsFriend(updatedIsFriend);
      setShowFriendAddedFeedback(nextIsFriend && updatedIsFriend);
      onFriendshipChange?.(updatedIsFriend);
    } catch (updateError) {
      setFriendError(
        updateError instanceof Error
          ? updateError.message
          : "친구 정보를 변경하지 못했습니다.",
      );
    } finally {
      setFriendPending(false);
    }
  };

  if (typeof document === "undefined") return null;

  const displayName = summary?.displayName ?? user.displayName;
  const affiliation = summary?.affiliation ?? user.affiliation;

  return createPortal(
    <div
      role="presentation"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="ranking-user-summary-title"
        className="max-h-[min(86vh,42rem)] w-full max-w-md overflow-y-auto rounded-3xl border border-stone-200 bg-white shadow-2xl dark:border-stone-700 dark:bg-stone-900"
      >
        <div
          className={`sticky top-0 z-10 flex gap-3 border-b border-stone-200 bg-white/95 px-5 py-4 backdrop-blur dark:border-stone-700 dark:bg-stone-900/95 ${
            affiliation ? "items-start" : "items-center"
          }`}
        >
          <span
            aria-hidden
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-amber-100 font-sans text-lg font-bold text-amber-900 dark:bg-amber-900/45 dark:text-amber-200"
          >
            {displayName.slice(0, 1)}
          </span>
          <div className="min-w-0 flex-1">
            <h2
              id="ranking-user-summary-title"
              className="truncate font-sans text-base font-bold text-stone-900 dark:text-stone-100"
            >
              {displayName}님의 말씀 읽기
            </h2>
            {affiliation && (
              <p className="mt-0.5 truncate text-xs text-stone-500 dark:text-stone-400">
                {affiliation}
              </p>
            )}
          </div>
          <button
            type="button"
            autoFocus
            onClick={onClose}
            aria-label="사용자 말씀 읽기 활동 닫기"
            className="-mr-1 flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-2xl leading-none text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200"
          >
            ×
          </button>
        </div>

        <div className="p-5">
          {!summary && !error && <ActivitySummarySkeleton />}

          {error && (
            <div
              role="alert"
              className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-8 text-center text-sm leading-6 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200"
            >
              {error}
            </div>
          )}

          {summary && (
            <ActivitySummaryContent
              summary={summary}
              comparisonSummary={currentUserSummary}
            />
          )}

          {currentUsername !== user.username && (
            <div className="mt-7">
              {!authLoading && !currentUsername ? (
                <Link
                  href="/login"
                  className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-sm font-semibold text-amber-800 transition-colors hover:bg-amber-50/50 dark:border-amber-700 dark:bg-stone-900 dark:text-amber-300 dark:hover:bg-amber-950/20"
                >
                  로그인 후 친구 등록
                </Link>
              ) : canManageFriend ? (
                <button
                  type="button"
                  onClick={() => void updateFriendship()}
                  disabled={
                    isFriend === null ||
                    friendPending ||
                    showFriendAddedFeedback
                  }
                  aria-live="polite"
                  className={`inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-xl border bg-white px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-wait disabled:opacity-60 dark:bg-stone-900 ${
                    showFriendAddedFeedback
                      ? "border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-300"
                      : isFriend
                      ? "border-rose-200 text-rose-600 hover:bg-rose-50/50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/20"
                      : "border-amber-300 text-amber-800 hover:bg-amber-50/50 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-950/20"
                  }`}
                >
                  {friendPending
                    ? "처리하는 중…"
                    : isFriend === null
                      ? "친구 상태 확인 중…"
                      : showFriendAddedFeedback
                        ? "내가 찾은 친구로 등록했어요."
                        : isFriend
                        ? "친구 해제"
                        : "친구 등록"}
                </button>
              ) : null}

              {friendError && (
                <p
                  role="status"
                  className="mt-2 text-center text-xs text-rose-600 dark:text-rose-400"
                >
                  {friendError}
                </p>
              )}
            </div>
          )}
        </div>
      </section>
    </div>,
    document.body,
  );
}
