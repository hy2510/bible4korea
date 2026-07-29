"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useUserNickname } from "@/components/useUserNickname";
import type { BibleBook } from "@/lib/bible-api";
import {
  deleteLastReadBooks,
  getLastReadChapters,
  getServerLastReadChapters,
  subscribeToLastReadChapters,
} from "@/lib/last-read";
import {
  deletePronunciationProgressByBooks,
  getBookPronunciationProgress,
  getPronunciationProgressSnapshot,
  getServerPronunciationProgressSnapshot,
  subscribeToPronunciationProgress,
} from "@/lib/pronunciation-progress";

interface ReadingHistoryManagerProps {
  books: BibleBook[];
  bibleVerseCounts: Record<string, number>;
}

type HistoryTab = "viewed" | "read";

interface BookHistoryRecord {
  book: BibleBook;
  count: number;
  percentage?: number;
}

const HISTORY_TAB_LABELS: Record<HistoryTab, string> = {
  viewed: "최근 본 말씀",
  read: "최근 읽은 말씀",
};

export function ReadingHistoryManager({
  books,
  bibleVerseCounts,
}: ReadingHistoryManagerProps) {
  const { user, loading, configured, syncStatus } = useAuth();
  const { displayName } = useUserNickname();
  const lastReadChapters = useSyncExternalStore(
    subscribeToLastReadChapters,
    getLastReadChapters,
    getServerLastReadChapters,
  );
  const pronunciationProgress = useSyncExternalStore(
    subscribeToPronunciationProgress,
    getPronunciationProgressSnapshot,
    getServerPronunciationProgressSnapshot,
  );
  const [selectedTab, setSelectedTab] = useState<HistoryTab>("viewed");
  const [selectedByTab, setSelectedByTab] = useState<
    Record<HistoryTab, Set<string>>
  >(() => ({
    viewed: new Set(),
    read: new Set(),
  }));
  const [deletedMessage, setDeletedMessage] = useState("");

  if (loading) {
    return (
      <section className="mt-8">
        <div className="rounded-xl border border-border bg-surface-muted px-4 py-4 text-sm text-muted">
          로그인 상태를 확인하고 있습니다.
        </div>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="mt-8">
        <div className="rounded-2xl border border-border bg-surface px-5 py-10 text-center sm:px-8">
          <p className="text-sm leading-relaxed text-muted">
            최근 본 말씀과 최근 읽은 말씀 기록은 로그인한 회원만 확인하고
            동기화할 수 있습니다.
          </p>
          {configured ? (
            <Link
              href="/login"
              className="mt-5 inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl bg-amber-800 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-900"
            >
              로그인
            </Link>
          ) : (
            <p className="mt-4 text-xs text-rose-700 dark:text-rose-400">
              Supabase 연결 정보를 확인해 주세요.
            </p>
          )}
        </div>
      </section>
    );
  }

  const viewedRecords: BookHistoryRecord[] = books.flatMap((book) => {
    const count = lastReadChapters.filter(
      (entry) => entry.bookSlug === book.slug,
    ).length;
    return count > 0 ? [{ book, count }] : [];
  });
  const readRecords: BookHistoryRecord[] = books.flatMap((book) => {
    const progress = getBookPronunciationProgress(
      pronunciationProgress,
      book.slug,
      bibleVerseCounts[book.slug] ?? 0,
    );
    return progress.completedVerses > 0
      ? [
          {
            book,
            count: progress.completedVerses,
            percentage: progress.percentage,
          },
        ]
      : [];
  });
  const activeRecords =
    selectedTab === "viewed" ? viewedRecords : readRecords;
  const selectedBookSlugs = selectedByTab[selectedTab];
  const allSelected =
    activeRecords.length > 0 &&
    activeRecords.every(({ book }) => selectedBookSlugs.has(book.slug));

  const changeTab = (tab: HistoryTab) => {
    setSelectedTab(tab);
    setDeletedMessage("");
  };

  const toggleBook = (bookSlug: string) => {
    setDeletedMessage("");
    setSelectedByTab((current) => {
      const nextSelection = new Set(current[selectedTab]);
      if (nextSelection.has(bookSlug)) {
        nextSelection.delete(bookSlug);
      } else {
        nextSelection.add(bookSlug);
      }
      return { ...current, [selectedTab]: nextSelection };
    });
  };

  const toggleAll = () => {
    setDeletedMessage("");
    setSelectedByTab((current) => ({
      ...current,
      [selectedTab]: allSelected
        ? new Set()
        : new Set(activeRecords.map(({ book }) => book.slug)),
    }));
  };

  const deleteSelectedHistory = () => {
    if (selectedBookSlugs.size === 0) return;

    const historyLabel = HISTORY_TAB_LABELS[selectedTab];
    const confirmed = window.confirm(
      `선택한 ${selectedBookSlugs.size}권의 ${historyLabel} 기록을 삭제할까요?\n삭제한 기록은 복구할 수 없습니다.`,
    );
    if (!confirmed) return;

    const deletedCount = selectedBookSlugs.size;
    if (selectedTab === "viewed") {
      deleteLastReadBooks(selectedBookSlugs);
    } else {
      deletePronunciationProgressByBooks(selectedBookSlugs);
    }
    setSelectedByTab((current) => ({
      ...current,
      [selectedTab]: new Set(),
    }));
    setDeletedMessage(
      `${historyLabel}에서 선택한 ${deletedCount}권의 기록을 삭제했습니다.`,
    );
  };

  return (
    <section className="mt-8">
      <div className="mb-5 rounded-xl border border-border bg-surface-muted px-4 py-3 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="min-w-0 truncate text-foreground">
            <strong className="font-semibold">{displayName}</strong>
          </p>
          <p
            className={
              syncStatus === "error"
                ? "text-rose-700 dark:text-rose-400"
                : "text-muted"
            }
          >
            {syncStatus === "syncing"
              ? "DB 동기화 중…"
              : syncStatus === "error"
                ? "DB 동기화를 확인해 주세요."
                : syncStatus === "synced"
                  ? "DB 동기화 완료"
                  : "DB 동기화 준비 중…"}
          </p>
        </div>
      </div>

      <div
        role="tablist"
        aria-label="관리할 기록 선택"
        className="mb-6 grid grid-cols-2 rounded-xl bg-stone-100 p-1 dark:bg-stone-950/50"
      >
        {(["viewed", "read"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            id={`management-tab-${tab}`}
            aria-selected={selectedTab === tab}
            aria-controls={`management-panel-${tab}`}
            onClick={() => changeTab(tab)}
            className={`min-h-11 cursor-pointer rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              selectedTab === tab
                ? "bg-white text-stone-900 shadow-sm dark:bg-stone-800 dark:text-stone-100"
                : "text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
            }`}
          >
            {HISTORY_TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {deletedMessage && (
        <p
          role="status"
          className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300"
        >
          {deletedMessage}
        </p>
      )}

      {(["viewed", "read"] as const).map((tab) => {
        const records = tab === "viewed" ? viewedRecords : readRecords;
        const selectedSlugs = selectedByTab[tab];

        return (
          <div
            key={tab}
            role="tabpanel"
            id={`management-panel-${tab}`}
            aria-labelledby={`management-tab-${tab}`}
            hidden={selectedTab !== tab}
            tabIndex={0}
          >
            {records.length === 0 ? (
              <div className="rounded-2xl border border-border bg-surface px-5 py-10 text-center sm:px-8">
                <p className="text-sm text-muted">
                  {tab === "viewed"
                    ? "삭제할 최근 본 말씀 기록이 없습니다."
                    : "삭제할 최근 읽은 말씀 기록이 없습니다."}
                </p>
                <Link
                  href="/books"
                  className="mt-5 inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl bg-amber-800 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-900"
                >
                  성경 목차 보기
                </Link>
              </div>
            ) : (
              <>
                <div className="mb-3 flex items-center justify-between gap-4">
                  <p className="text-sm text-muted">
                    {selectedSlugs.size}권 선택
                  </p>
                  <button
                    type="button"
                    onClick={toggleAll}
                    className="min-h-10 cursor-pointer rounded-lg px-3 text-sm font-medium text-amber-800 transition-colors hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30"
                  >
                    {allSelected ? "전체 선택 해제" : "전체 선택"}
                  </button>
                </div>

                <ul className="grid gap-3 sm:grid-cols-2">
                  {records.map(({ book, count, percentage }) => {
                    const selected = selectedSlugs.has(book.slug);

                    return (
                      <li key={book.id}>
                        <label
                          className={`flex cursor-pointer gap-3 rounded-2xl border px-4 py-4 transition-colors ${
                            selected
                              ? "border-amber-500 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/25"
                              : "border-border bg-surface hover:border-amber-300 dark:hover:border-amber-800"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleBook(book.slug)}
                            className="mt-0.5 size-5 shrink-0 accent-amber-800"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-baseline justify-between gap-3">
                              <span className="font-semibold text-foreground">
                                {book.name}
                              </span>
                              {tab === "read" && (
                                <span className="shrink-0 text-xs text-muted">
                                  읽기 {percentage}%
                                </span>
                              )}
                            </span>
                            <span className="mt-1 block text-xs leading-5 text-muted">
                              {tab === "viewed"
                                ? `최근 본 기록 ${count}개`
                                : `소리 내어 읽기 ${count}절 완료`}
                            </span>
                            {tab === "read" && (
                              <span
                                className="mt-2 block h-1 overflow-hidden rounded-full bg-stone-100 dark:bg-black/40"
                                aria-hidden
                              >
                                <span
                                  className="block h-full rounded-full bg-amber-700 transition-[width] duration-500"
                                  style={{ width: `${percentage}%` }}
                                />
                              </span>
                            )}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>

                <button
                  type="button"
                  onClick={deleteSelectedHistory}
                  disabled={selectedSlugs.size === 0}
                  className="mt-6 inline-flex min-h-12 w-full cursor-pointer items-center justify-center rounded-xl bg-rose-700 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
                >
                  선택한 {HISTORY_TAB_LABELS[tab]} 삭제
                </button>
              </>
            )}
          </div>
        );
      })}
    </section>
  );
}
