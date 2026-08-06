"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { ChevronLeftIcon } from "@/components/ChevronIcons";
import { lockBodyScroll, resetBodyScrollLock } from "@/lib/body-scroll-lock";
import { stripKoreanBibleQuotes } from "@/lib/korean-verse-text";
import { SAFE_AREA } from "@/lib/safe-area";
import {
  parseGematriaQuery,
  parseStrongsQuery,
} from "@/lib/strongs-links";

const PAGE_SIZE = 10;

interface SearchResult {
  bookSlug: string;
  bookName: string;
  chapter: number;
  verse: number;
  text: string;
  reference: string;
}

interface BookGroup {
  bookSlug: string;
  bookName: string;
  count: number;
}

interface GematriaSearchMatch {
  strongs: string;
  original: string;
  gloss: string | null;
  gematria: number;
}

type SearchData =
  | {
      view: "books";
      query: string;
      queryGloss?: string | null;
      total: number;
      books: BookGroup[];
    }
  | {
      view: "verses";
      query: string;
      queryGloss?: string | null;
      bookSlug: string;
      bookName: string;
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
      results: SearchResult[];
    }
  | {
      view: "gematria";
      query: string;
      value: number;
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
      matches: GematriaSearchMatch[];
    };

function highlightText(text: string, query: string) {
  const displayText = stripKoreanBibleQuotes(text);
  const terms = query.trim().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return displayText;

  const pattern = new RegExp(
    `(${terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
    "gi",
  );

  const parts = displayText.split(pattern);
  return parts.map((part, index) =>
    index % 2 === 1 ? (
      <mark
        key={`${part}-${index}`}
        className="rounded bg-amber-100/90 px-0.5 text-amber-950 dark:bg-amber-900/40 dark:text-amber-100"
      >
        {part}
      </mark>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    ),
  );
}

function SearchPagination({
  page,
  totalPages,
  onPageChange,
  className = "",
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}) {
  if (totalPages <= 1) return null;

  return (
    <div
      className={`flex items-center justify-between gap-3 border-stone-200/80 ${className}`}
    >
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(Math.max(1, page - 1))}
        className="cursor-pointer rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-700 transition-colors enabled:hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        이전
      </button>
      <p className="text-sm text-stone-500">
        {page} / {totalPages}페이지
      </p>
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        className="cursor-pointer rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-700 transition-colors enabled:hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        다음
      </button>
    </div>
  );
}

function normalizeSearchQuery(query: string): string {
  const strongs = parseStrongsQuery(query);
  if (strongs) return strongs;
  const gematria = parseGematriaQuery(query);
  if (gematria !== null) return String(gematria);
  return query.trim();
}

function formatSearchQueryLabel(query: string, gloss?: string | null): string {
  if (gloss) return `${query} (${gloss})`;
  if (parseGematriaQuery(query) !== null) return `수치 ${query}`;
  return query;
}

export function BibleSearchDialog({
  open,
  onClose,
  onRegisterPrime,
}: {
  open: boolean;
  onClose: () => void;
  onRegisterPrime?: (prime: (query: string) => void) => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [selectedBook, setSelectedBook] = useState<BookGroup | null>(null);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<SearchData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gematriaBack, setGematriaBack] = useState<{
    query: string;
    page: number;
  } | null>(null);
  const keepGematriaBackRef = useRef(false);

  const beginSearch = () => {
    setLoading(true);
    setError(null);
  };

  const primeSearch = useCallback((nextQuery: string) => {
    const normalized = normalizeSearchQuery(nextQuery);
    if (!normalized) return;
    if (!keepGematriaBackRef.current) {
      setGematriaBack(null);
    }
    keepGematriaBackRef.current = false;
    setQuery(normalized);
    beginSearch();
    setSubmittedQuery(normalized);
    setSelectedBook(null);
    setPage(1);
  }, []);

  useEffect(() => {
    onRegisterPrime?.(primeSearch);
    return () => {
      onRegisterPrime?.(() => {});
    };
  }, [onRegisterPrime, primeSearch]);

  const handleClose = useCallback(() => {
    setGematriaBack(null);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    const unlock = lockBodyScroll();
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") handleClose();
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      unlock();
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, handleClose]);

  useEffect(() => {
    if (!submittedQuery) return;

    const controller = new AbortController();
    const gematriaValue = parseGematriaQuery(submittedQuery);

    void (async () => {
      try {
        if (gematriaValue !== null) {
          const url = `/api/strongs/gematria/${gematriaValue}?page=${page}&pageSize=${PAGE_SIZE}&filter=all`;
          const res = await fetch(url, { signal: controller.signal });
          const json = await res.json();
          if (!res.ok) {
            throw new Error(json.error ?? "검색에 실패했습니다.");
          }
          setData({
            view: "gematria",
            query: String(gematriaValue),
            value: gematriaValue,
            page: json.page,
            pageSize: json.pageSize,
            total: json.total,
            totalPages: json.totalPages,
            matches: json.matches,
          });
          return;
        }

        const url = selectedBook
          ? `/api/search?q=${encodeURIComponent(submittedQuery)}&book=${encodeURIComponent(selectedBook.bookSlug)}&page=${page}&pageSize=${PAGE_SIZE}`
          : `/api/search?q=${encodeURIComponent(submittedQuery)}`;

        const res = await fetch(url, {
          signal: controller.signal,
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error ?? "검색에 실패했습니다.");
        }
        setData(json as SearchData);
      } catch (fetchError) {
        if (controller.signal.aborted) return;
        setData(null);
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "검색에 실패했습니다.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      controller.abort();
    };
  }, [submittedQuery, selectedBook, page]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const nextQuery = normalizeSearchQuery(query);
    if (!nextQuery) return;
    setGematriaBack(null);
    beginSearch();
    setQuery(nextQuery);
    setSubmittedQuery(nextQuery);
    setSelectedBook(null);
    setPage(1);
  };

  const handleBookClick = (book: BookGroup) => {
    beginSearch();
    setSelectedBook(book);
    setPage(1);
  };

  const handleBackToBooks = () => {
    beginSearch();
    setSelectedBook(null);
    setPage(1);
  };

  const handleBackToGematria = () => {
    if (!gematriaBack) return;
    const { query: backQuery, page: backPage } = gematriaBack;
    setGematriaBack(null);
    beginSearch();
    setQuery(backQuery);
    setSubmittedQuery(backQuery);
    setSelectedBook(null);
    setPage(backPage);
  };

  const handleGematriaWordClick = (strongs: string) => {
    if (data?.view === "gematria") {
      setGematriaBack({ query: data.query, page: data.page });
      keepGematriaBackRef.current = true;
    }
    primeSearch(strongs);
  };

  const handlePageChange = (nextPage: number) => {
    beginSearch();
    setPage(nextPage);
  };

  const handleResultClick = (result: SearchResult) => {
    window.dispatchEvent(new Event("bible4korea:close-overlays"));
    onClose();
    const strongs = parseStrongsQuery(submittedQuery);
    const params = new URLSearchParams({ from: "search" });
    if (strongs) params.set("strongs", strongs);
    const href = `/read/${result.bookSlug}/${result.chapter}?${params.toString()}#verse-${result.verse}`;
    // Let nested modal unlock effects flush before navigating.
    window.setTimeout(() => {
      resetBodyScrollLock();
      router.push(href);
    }, 0);
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-stretch justify-center p-0 sm:items-center sm:p-6">
      <div
        aria-hidden="true"
        className="absolute inset-0 hidden bg-stone-900/40 backdrop-blur-[1px] sm:block"
      />

      <div
        className={`relative flex h-full w-full max-w-none flex-col overflow-hidden bg-background sm:max-h-[85vh] sm:max-w-2xl sm:rounded-2xl sm:border sm:border-border sm:shadow-2xl ${SAFE_AREA.modal}`}
      >
        <div className="border-b border-stone-200/80 px-4 py-4 sm:px-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-serif text-lg font-bold text-stone-900">
              성경 구절 검색
            </h2>
            <button
              type="button"
              onClick={handleClose}
              className="cursor-pointer rounded-lg px-2 py-1 text-sm text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-800"
            >
              닫기
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="단어, Strong’s, 또는 게마트리아 수치"
              className="min-w-0 flex-1 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-base text-stone-900 outline-none ring-amber-800/20 transition-shadow placeholder:text-stone-400 focus:border-amber-300 focus:ring-4 sm:text-sm"
            />
            <button
              type="submit"
              className="shrink-0 cursor-pointer rounded-xl bg-amber-800 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-amber-900"
            >
              검색
            </button>
          </form>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          {!submittedQuery && (
            <p className="py-10 text-center text-sm text-stone-500">
              한국어 성경 본문, Strong&apos;s 번호(H/G), 또는 숫자만 입력하면
              게마트리아 수치와 같은 히브리어 단어를 검색합니다.
            </p>
          )}

          {gematriaBack &&
            submittedQuery &&
            parseGematriaQuery(submittedQuery) === null &&
            !selectedBook && (
            <button
              type="button"
              onClick={handleBackToGematria}
              className="mb-4 inline-flex shrink-0 cursor-pointer items-center gap-1 whitespace-nowrap text-sm font-medium text-amber-900 transition-colors hover:text-amber-950"
            >
              <ChevronLeftIcon className="h-4 w-4 shrink-0" />
              게마트리아 수치 {gematriaBack.query}
            </button>
          )}

          {submittedQuery && loading && (
            <p className="py-10 text-center text-sm text-stone-500">검색 중…</p>
          )}

          {submittedQuery && error && (
            <p className="py-10 text-center text-sm text-red-600">{error}</p>
          )}

          {submittedQuery && !loading && !error && data && data.total === 0 && (
            <p className="py-10 text-center text-sm text-stone-500">
              &ldquo;{formatSearchQueryLabel(data.query, data.view === "gematria" ? null : data.queryGloss)}
              &rdquo;에 해당하는{" "}
              {data.view === "gematria" ? "단어가" : "구절이"} 없습니다.
            </p>
          )}

          {submittedQuery &&
            !loading &&
            !error &&
            data &&
            data.total > 0 &&
            data.view === "gematria" && (
              <>
                <p className="mb-4 text-sm text-stone-500">
                  게마트리아 &ldquo;수치 {data.value}&rdquo; ·{" "}
                  {data.total.toLocaleString()}개 단어 · 단어나 Strong&apos;s를
                  누르면 구절을 검색합니다
                </p>

                <SearchPagination
                  page={data.page}
                  totalPages={data.totalPages}
                  onPageChange={handlePageChange}
                  className="mb-4 border-b pb-4"
                />

                <ul className="divide-y divide-stone-100/80 dark:divide-border">
                  {data.matches.map((match) => (
                    <li key={match.strongs}>
                      <div className="flex w-full flex-wrap items-baseline gap-x-3 gap-y-1 px-1 py-2.5">
                        <button
                          type="button"
                          onClick={() => handleGematriaWordClick(match.strongs)}
                          className="shrink-0 cursor-pointer font-hebrew text-lg text-stone-800 transition-colors hover:text-amber-900"
                          title={`${match.strongs} 구절 검색`}
                        >
                          <span dir="rtl" lang="he">
                            {match.original}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleGematriaWordClick(match.strongs)}
                          title={`${match.strongs} 구절 검색`}
                          className="shrink-0 cursor-pointer font-mono text-xs font-medium text-amber-800 underline-offset-2 transition-colors hover:text-amber-950 hover:underline"
                        >
                          {match.strongs}
                        </button>
                        {match.gloss && (
                          <span className="min-w-0 text-sm text-stone-600">
                            {match.gloss}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>

                <SearchPagination
                  page={data.page}
                  totalPages={data.totalPages}
                  onPageChange={handlePageChange}
                  className="mt-5 border-t pt-4"
                />
              </>
            )}

          {submittedQuery &&
            !loading &&
            !error &&
            data &&
            data.total > 0 &&
            data.view === "books" && (
              <>
                <p className="mb-4 text-sm text-stone-500">
                  &ldquo;{formatSearchQueryLabel(data.query, data.queryGloss)}
                  &rdquo; 검색 결과 {data.total.toLocaleString()}건 ·{" "}
                  {data.books.length}권
                </p>

                <ul className="space-y-2">
                  {data.books.map((book) => (
                    <li key={book.bookSlug}>
                      <button
                        type="button"
                        onClick={() => handleBookClick(book)}
                        className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-stone-200/80 bg-white px-4 py-3 text-left transition-colors hover:border-amber-200 hover:bg-amber-50/60"
                      >
                        <p className="text-sm font-semibold text-amber-900">
                          {book.bookName}
                        </p>
                        <p className="shrink-0 text-sm text-stone-500">
                          {book.count.toLocaleString()}건
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}

          {submittedQuery &&
            !loading &&
            !error &&
            data &&
            data.total > 0 &&
            data.view === "verses" && (
              <>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={handleBackToBooks}
                    className="inline-flex shrink-0 cursor-pointer items-center gap-1 whitespace-nowrap text-sm font-medium text-amber-900 transition-colors hover:text-amber-950"
                  >
                    <ChevronLeftIcon className="h-4 w-4 shrink-0" />
                    권 목록
                  </button>
                  <p className="min-w-0 text-right text-sm text-stone-500">
                    {data.bookName} · &ldquo;
                    {formatSearchQueryLabel(data.query, data.queryGloss)}&rdquo; ·{" "}
                    {data.total.toLocaleString()}건
                  </p>
                </div>

                <SearchPagination
                  page={data.page}
                  totalPages={data.totalPages}
                  onPageChange={handlePageChange}
                  className="mb-4 border-b pb-4"
                />

                <ul className="space-y-2">
                  {data.results.map((result) => (
                    <li
                      key={`${result.bookSlug}-${result.chapter}-${result.verse}`}
                    >
                      <button
                        type="button"
                        onClick={() => handleResultClick(result)}
                        className="w-full cursor-pointer rounded-xl border border-stone-200/80 bg-white px-4 py-3 text-left transition-colors hover:border-amber-200 hover:bg-amber-50/60"
                      >
                        <p className="text-sm font-semibold text-amber-900">
                          {result.reference}
                        </p>
                        <p className="mt-1 text-sm leading-relaxed text-stone-700">
                          {highlightText(result.text, data.query)}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>

                <SearchPagination
                  page={data.page}
                  totalPages={data.totalPages}
                  onPageChange={handlePageChange}
                  className="mt-5 border-t pt-4"
                />
              </>
            )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

interface BibleSearchContextValue {
  openSearch: (query?: string) => void;
  isSearchOpen: boolean;
}

const BibleSearchContext = createContext<BibleSearchContextValue | null>(null);

export function useBibleSearch() {
  const context = useContext(BibleSearchContext);
  if (!context) {
    throw new Error("useBibleSearch must be used within BibleSearchProvider");
  }
  return context;
}

export function BibleSearchProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const primeSearchRef = useRef<(query: string) => void>(() => {});

  const openSearch = useCallback((query?: string) => {
    if (query?.trim()) {
      primeSearchRef.current(query.trim());
    }
    setOpen(true);
  }, []);

  const contextValue = useMemo(
    () => ({
      openSearch,
      isSearchOpen: open,
    }),
    [openSearch, open],
  );

  return (
    <BibleSearchContext.Provider value={contextValue}>
      {children}
      <BibleSearchDialog
        open={open}
        onClose={() => setOpen(false)}
        onRegisterPrime={(prime) => {
          primeSearchRef.current = prime;
        }}
      />
    </BibleSearchContext.Provider>
  );
}

export function BibleSearchButton() {
  const { openSearch } = useBibleSearch();

  return (
    <button
      type="button"
      onClick={() => openSearch()}
      className="cursor-pointer rounded-lg px-3 py-1.5 text-sm font-bold text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900"
    >
      검색
    </button>
  );
}
