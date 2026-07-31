"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { authenticatedFetch } from "@/lib/authenticated-fetch";
import type {
  FriendDiscoveryItem,
  FriendDiscoveryResponse,
  FriendshipStatusResponse,
} from "@/lib/user-friends";

type DiscoveryMode = "username" | "affiliation";

interface FriendFinderModalProps {
  onClose: () => void;
  onFriendAdded: (friend: FriendDiscoveryItem) => void;
}

export function FriendFinderModal({
  onClose,
  onFriendAdded,
}: FriendFinderModalProps) {
  const titleId = useId();
  const requestControllerRef = useRef<AbortController | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<DiscoveryMode>("username");
  const [query, setQuery] = useState("");
  const [activeUsernameQuery, setActiveUsernameQuery] = useState("");
  const [results, setResults] = useState<FriendDiscoveryItem[]>([]);
  const [affiliation, setAffiliation] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [pendingUsername, setPendingUsername] = useState<string | null>(
    null,
  );
  const [error, setError] = useState("");

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      requestControllerRef.current?.abort();
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const discoverFriends = async (
    nextMode: DiscoveryMode,
    usernameQuery = "",
    page = 1,
  ) => {
    requestControllerRef.current?.abort();
    const controller = new AbortController();
    requestControllerRef.current = controller;
    setLoading(true);
    setError("");
    setSearched(true);

    const params = new URLSearchParams({ mode: nextMode });
    if (nextMode === "username") {
      params.set("query", usernameQuery.trim().toLowerCase());
    }
    params.set("page", String(page));

    try {
      const response = await authenticatedFetch(
        `/api/friends/discover?${params.toString()}`,
        {
          cache: "no-store",
          signal: controller.signal,
        },
      );
      const data = (await response.json().catch(() => null)) as
        | FriendDiscoveryResponse
        | { message?: string }
        | null;
      if (!response.ok) {
        throw new Error(
          data && "message" in data && data.message
            ? data.message
            : "친구 검색 결과를 불러오지 못했습니다.",
        );
      }

      const discovery = data as FriendDiscoveryResponse;
      setResults(discovery.items);
      setAffiliation(discovery.affiliation);
      setCurrentPage(discovery.page);
      setTotalPages(discovery.totalPages);
      if (nextMode === "username") {
        setActiveUsernameQuery(usernameQuery.trim().toLowerCase());
      }
      contentRef.current?.scrollTo({ top: 0 });
    } catch (fetchError) {
      if (controller.signal.aborted) return;
      setResults([]);
      setAffiliation(null);
      setCurrentPage(1);
      setTotalPages(0);
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "친구 검색 결과를 불러오지 못했습니다.",
      );
    } finally {
      if (requestControllerRef.current === controller) {
        setLoading(false);
      }
    }
  };

  const changeMode = (nextMode: DiscoveryMode) => {
    requestControllerRef.current?.abort();
    setMode(nextMode);
    setActiveUsernameQuery("");
    setResults([]);
    setAffiliation(null);
    setError("");
    setSearched(false);
    setLoading(false);
    setCurrentPage(1);
    setTotalPages(0);

    if (nextMode === "affiliation") {
      void discoverFriends("affiliation");
    }
  };

  const addFriend = async (friend: FriendDiscoveryItem) => {
    if (friend.isFriend || pendingUsername) return;

    setPendingUsername(friend.username);
    setError("");

    try {
      const response = await authenticatedFetch(
        `/api/friends/${encodeURIComponent(friend.username)}`,
        {
          method: "POST",
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
            : "친구로 추가하지 못했습니다.",
        );
      }

      setResults((current) =>
        current.map((item) =>
          item.username === friend.username
            ? { ...item, isFriend: true }
            : item,
        ),
      );
      onFriendAdded({ ...friend, isFriend: true });
    } catch (addError) {
      setError(
        addError instanceof Error
          ? addError.message
          : "친구로 추가하지 못했습니다.",
      );
    } finally {
      setPendingUsername(null);
    }
  };

  if (typeof document === "undefined") return null;

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
        aria-labelledby={titleId}
        className="flex max-h-[min(86vh,42rem)] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-2xl dark:border-stone-700 dark:bg-stone-900"
      >
        <div className="flex shrink-0 items-center gap-3 border-b border-stone-200 px-5 py-4 dark:border-stone-700">
          <div className="min-w-0 flex-1">
            <h2
              id={titleId}
              className="font-serif text-lg font-bold text-stone-900 dark:text-stone-100"
            >
              친구 찾기
            </h2>
            <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
              아이디 또는 같은 모임에서 친구를 찾아보세요.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="친구 찾기 닫기"
            className="-mr-1 flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-2xl leading-none text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200"
          >
            ×
          </button>
        </div>

        <div className="grid shrink-0 grid-cols-2 border-b border-stone-100 px-5 pt-4 dark:border-stone-800">
          <button
            type="button"
            onClick={() => changeMode("username")}
            aria-pressed={mode === "username"}
            className={`cursor-pointer border-b-2 px-3 py-3 text-sm font-semibold ${
              mode === "username"
                ? "border-amber-700 text-amber-800 dark:border-amber-500 dark:text-amber-300"
                : "border-transparent text-stone-400 dark:text-stone-500"
            }`}
          >
            아이디 검색
          </button>
          <button
            type="button"
            onClick={() => changeMode("affiliation")}
            aria-pressed={mode === "affiliation"}
            className={`cursor-pointer border-b-2 px-3 py-3 text-sm font-semibold ${
              mode === "affiliation"
                ? "border-amber-700 text-amber-800 dark:border-amber-500 dark:text-amber-300"
                : "border-transparent text-stone-400 dark:text-stone-500"
            }`}
          >
            같은 모임
          </button>
        </div>

        <div
          ref={contentRef}
          className="min-h-0 flex-1 overflow-y-auto p-5"
        >
          {mode === "username" && (
            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                if (!query.trim()) {
                  setError("찾을 아이디를 입력해 주세요.");
                  return;
                }
                void discoverFriends("username", query);
              }}
            >
              <label htmlFor="friend-username-search" className="sr-only">
                친구 아이디
              </label>
              <input
                id="friend-username-search"
                type="search"
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                maxLength={20}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="아이디를 입력하세요"
                className="min-h-11 min-w-0 flex-1 rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition-colors placeholder:text-stone-400 focus:border-amber-600 focus:ring-2 focus:ring-amber-600/15 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
              />
              <button
                type="submit"
                disabled={loading}
                className="inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-amber-800 px-4 text-sm font-semibold text-white transition-colors hover:bg-amber-900 disabled:cursor-wait disabled:opacity-60"
              >
                검색
              </button>
            </form>
          )}

          {mode === "affiliation" && affiliation && (
            <p className="rounded-xl bg-emerald-50 px-4 py-3 text-center text-sm font-semibold text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
              {affiliation}
            </p>
          )}

          {error && (
            <p
              role="alert"
              className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-center text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300"
            >
              {error}
            </p>
          )}

          {loading && (
            <div
              className="mt-5 space-y-2 animate-pulse"
              aria-label="친구 검색 결과를 불러오는 중"
            >
              <div className="h-16 rounded-xl bg-stone-100 dark:bg-stone-800" />
              <div className="h-16 rounded-xl bg-stone-100 dark:bg-stone-800" />
              <div className="h-16 rounded-xl bg-stone-100 dark:bg-stone-800" />
            </div>
          )}

          {!loading && !error && !searched && mode === "username" && (
            <p className="px-4 py-12 text-center text-sm leading-6 text-stone-500 dark:text-stone-400">
              찾고 싶은 사용자의 아이디를 입력해 주세요.
              <br />
              아이디 앞부분만 입력해도 검색할 수 있습니다.
            </p>
          )}

          {!loading &&
            !error &&
            searched &&
            mode === "affiliation" &&
            !affiliation && (
              <p className="px-4 py-12 text-center text-sm leading-6 text-stone-500 dark:text-stone-400">
                승인된 모임이 없습니다.
                <br />
                내 모임에서 모임을 만들거나 검색하여 가입해 주세요.
              </p>
            )}

          {!loading &&
            !error &&
            searched &&
            (mode === "username" || Boolean(affiliation)) &&
            results.length === 0 && (
              <p className="px-4 py-12 text-center text-sm text-stone-500 dark:text-stone-400">
                조건에 맞는 사용자가 없습니다.
              </p>
            )}

          {!loading && results.length > 0 && (
            <>
              <ul className="mt-5 space-y-2">
                {results.map((friend) => (
                  <li
                    key={friend.username}
                    className="flex min-h-16 items-center gap-3 rounded-xl border border-stone-100 px-3 py-2.5 dark:border-stone-800"
                  >
                    <span
                      aria-hidden
                      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-100 font-sans text-sm font-bold text-amber-900 dark:bg-amber-900/45 dark:text-amber-200"
                    >
                      {friend.displayName.slice(0, 1)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-stone-900 dark:text-stone-100">
                        {friend.displayName}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-stone-500 dark:text-stone-400">
                        {friend.username}
                        {friend.affiliation
                          ? ` · ${friend.affiliation}`
                          : ""}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => void addFriend(friend)}
                      disabled={
                        friend.isFriend || pendingUsername !== null
                      }
                      className={`inline-flex min-h-9 shrink-0 items-center justify-center rounded-lg border px-3 text-xs font-semibold ${
                        friend.isFriend
                          ? "cursor-default border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
                          : "cursor-pointer border-amber-300 bg-white text-amber-800 hover:bg-amber-50/50 disabled:cursor-wait disabled:opacity-60 dark:border-amber-700 dark:bg-stone-900 dark:text-amber-300 dark:hover:bg-amber-950/20"
                      }`}
                    >
                      {friend.isFriend
                        ? "추가됨"
                        : pendingUsername === friend.username
                          ? "추가 중…"
                          : "추가"}
                    </button>
                  </li>
                ))}
              </ul>

              {totalPages > 1 && (
                <nav
                  aria-label={
                    mode === "username"
                      ? "아이디 검색 결과 페이지"
                      : "같은 모임 사용자 페이지"
                  }
                  className="mt-5 flex items-center justify-between gap-3"
                >
                  <button
                    type="button"
                    onClick={() =>
                      void discoverFriends(
                        mode,
                        mode === "username"
                          ? activeUsernameQuery
                          : "",
                        currentPage - 1,
                      )
                    }
                    disabled={currentPage <= 1}
                    className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-xl border border-stone-200 bg-white px-4 text-sm font-semibold text-stone-600 disabled:cursor-default disabled:opacity-35 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
                  >
                    이전
                  </button>
                  <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      void discoverFriends(
                        mode,
                        mode === "username"
                          ? activeUsernameQuery
                          : "",
                        currentPage + 1,
                      )
                    }
                    disabled={currentPage >= totalPages}
                    className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-xl border border-stone-200 bg-white px-4 text-sm font-semibold text-stone-600 disabled:cursor-default disabled:opacity-35 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
                  >
                    다음
                  </button>
                </nav>
              )}
            </>
          )}
        </div>
      </section>
    </div>,
    document.body,
  );
}
