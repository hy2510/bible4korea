"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ChevronIcons";
import { useBibleSearch } from "@/components/BibleSearch";
import {
  type OriginalWord,
  type WordLanguage,
} from "@/components/OriginalWordRow";
import { lockBodyScroll } from "@/lib/body-scroll-lock";
import {
  strongsWordHighlightClassName,
  featuredPanelClassName,
} from "@/lib/featured-panel";
import {
  analyzeHebrewWordLetters,
  markSurfaceLettersWithRoot,
  sumHebrewLetterValues,
  type MarkedHebrewLetter,
} from "@/lib/hebrew-letter-analysis";
import { SAFE_AREA } from "@/lib/safe-area";
import {
  isLinkableStrongs,
  isNonNumericHebrewStrongs,
  toMobileDictionaryUrl,
} from "@/lib/strongs-links";

interface DictionaryModalProps {
  open: boolean;
  initialIndex: number;
  words: OriginalWord[];
  language: WordLanguage;
  getDictionaryUrl: (strongs: string) => string;
  onClose: () => void;
}

type DictionaryTab = "dictionary" | "analysis";

interface StrongsDefinition {
  strongs: string;
  gloss: string | null;
  definition: string | null;
  original?: string | null;
  gematria?: number | null;
  rootKey?: string | null;
  rootText?: string | null;
}

interface GematriaMatch {
  strongs: string;
  original: string;
  gloss: string | null;
  gematria: number;
  rootKey?: string;
  rootText?: string;
  matchKind?: "root" | "number";
}

type GematriaFilter = "all" | "root" | "number";

interface AnalysisFocus {
  strongs: string;
  text: string;
  gloss: string | null;
}

function letterRoleClassName(role: MarkedHebrewLetter["role"]): string {
  switch (role) {
    case "root":
      return "bg-amber-50/90 dark:bg-amber-900/30";
    case "affix":
      return "bg-sky-50/90 dark:bg-sky-900/30";
    default:
      return "";
  }
}

function letterRoleBadge(role: MarkedHebrewLetter["role"]): string | null {
  switch (role) {
    case "root":
      return "어근";
    case "affix":
      return "본문";
    default:
      return null;
  }
}

function LetterAnalysisTable({
  wordText,
  rootText,
  letters,
  surfaceValueSum,
  rootValueSum,
  hasRoot,
  gematriaQuery,
  onOpenGematria,
}: {
  wordText: string;
  rootText: string | null;
  letters: MarkedHebrewLetter[];
  surfaceValueSum: number;
  rootValueSum: number;
  hasRoot: boolean;
  gematriaQuery: number | null;
  onOpenGematria: (value: number) => void;
}) {
  if (letters.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white">
      <div className="flex flex-col gap-2 border-b border-stone-200/80 bg-stone-50/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-border dark:bg-[#181512]">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="text-xs font-semibold tracking-wide text-amber-800/70">
            글자 분석
          </p>
          <span
            dir="rtl"
            lang="he"
            className="font-hebrew text-lg text-stone-800"
          >
            {wordText}
          </span>
          {rootText && (
            <span className="text-xs text-stone-500">
              어근{" "}
              <span dir="rtl" lang="he" className="font-hebrew text-stone-700">
                {rootText}
              </span>
            </span>
          )}
        </div>
        {hasRoot ? (
          <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-amber-300 dark:bg-amber-500/80" />
              어근
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-sky-300 dark:bg-sky-500/80" />
              본문만
            </span>
          </div>
        ) : null}
      </div>
      <div className="overflow-x-auto overscroll-x-contain">
        <table className="w-full min-w-[620px] border-collapse text-center text-sm">
          <caption className="sr-only">
            {wordText} 글자별 이름, 수치, 고대 그림과 핵심 의미
            {hasRoot ? " (어근·본문 구분)" : ""}
          </caption>
          <thead>
            <tr className="border-b border-stone-200 bg-white dark:border-border dark:bg-[#181512]">
              {hasRoot && (
                <th className="px-3 py-3 font-semibold text-stone-700 dark:text-stone-300">
                  구분
                </th>
              )}
              <th className="px-3 py-3 font-semibold text-stone-700 dark:text-stone-300">
                문자
              </th>
              <th className="px-3 py-3 font-semibold text-stone-700 dark:text-stone-300">
                이름
              </th>
              <th className="px-3 py-3 font-semibold text-stone-700 dark:text-stone-300">
                수치
              </th>
              <th className="px-3 py-3 font-semibold text-stone-700 dark:text-stone-300">
                고대 그림
              </th>
              <th className="px-3 py-3 font-semibold text-stone-700 dark:text-stone-300">
                핵심 의미
              </th>
            </tr>
          </thead>
          <tbody>
            {letters.map((item, index) => {
              const badge = letterRoleBadge(item.role);
              return (
                <tr
                  key={`${item.letter}-${index}`}
                  className={`border-b border-stone-100 last:border-b-0 ${letterRoleClassName(item.role)}`}
                >
                  {hasRoot && (
                    <td className="px-3 py-3">
                      {badge ? (
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            item.role === "root"
                              ? "bg-amber-200/80 text-amber-950 dark:bg-amber-800/55 dark:text-amber-100"
                              : "bg-sky-200/80 text-sky-950 dark:bg-sky-800/55 dark:text-sky-100"
                          }`}
                        >
                          {badge}
                        </span>
                      ) : (
                        <span className="text-stone-500">—</span>
                      )}
                    </td>
                  )}
                  <td className="px-3 py-3 font-hebrew text-2xl text-stone-800">
                    {item.letter}
                  </td>
                  <td className="px-3 py-3 text-stone-700">
                    {item.entry?.name ?? "—"}
                  </td>
                  <td className="px-3 py-3 text-stone-600">
                    {item.entry ? (
                      <button
                        type="button"
                        onClick={() => onOpenGematria(item.entry!.value)}
                        className={`cursor-pointer rounded px-1.5 py-0.5 font-medium underline-offset-2 transition-colors hover:bg-white/70 hover:underline dark:hover:bg-white/10 ${
                          gematriaQuery === item.entry.value
                            ? "ring-1 ring-amber-400"
                            : ""
                        }`}
                        title={`${item.entry.value} 같은 수치 단어 보기`}
                      >
                        {item.entry.value}
                      </button>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-3 text-stone-600">
                    {item.entry?.picture ?? "—"}
                  </td>
                  <td className="px-3 py-3 text-stone-600">
                    {item.entry?.meaning ?? "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-stone-100 px-3 py-2 text-xs text-stone-500">
        {hasRoot && (
          <span>
            어근 합계{" "}
            <button
              type="button"
              onClick={() => onOpenGematria(rootValueSum)}
              className="cursor-pointer font-semibold text-amber-800 underline-offset-2 hover:underline dark:text-amber-300"
            >
              {rootValueSum}
            </button>
          </span>
        )}
        <span>
          본문 합계{" "}
          <button
            type="button"
            onClick={() => onOpenGematria(surfaceValueSum)}
            className="cursor-pointer font-semibold text-sky-800 underline-offset-2 hover:underline dark:text-sky-300"
          >
            {surfaceValueSum}
          </button>
        </span>
      </div>
    </div>
  );
}

export function DictionaryModal({
  open,
  initialIndex,
  words,
  language,
  getDictionaryUrl,
  onClose,
}: DictionaryModalProps) {
  const { openSearch, isSearchOpen } = useBibleSearch();
  const isSearchOpenRef = useRef(isSearchOpen);
  isSearchOpenRef.current = isSearchOpen;
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [activeTab, setActiveTab] = useState<DictionaryTab>("dictionary");
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [fetchedDefinition, setFetchedDefinition] = useState<{
    strongs: string;
    data: StrongsDefinition | null;
    error: string | null;
  } | null>(null);
  const [analysisFocus, setAnalysisFocus] = useState<AnalysisFocus | null>(
    null,
  );
  const [gematriaQuery, setGematriaQuery] = useState<number | null>(null);
  const [gematriaPage, setGematriaPage] = useState(1);
  const [gematriaFilter, setGematriaFilter] = useState<GematriaFilter>("all");
  const [gematriaFetch, setGematriaFetch] = useState<{
    value: number;
    page: number;
    total: number;
    totalPages: number;
    filter: GematriaFilter;
    sourceRootText: string | null;
    counts: { all: number; root: number; number: number };
    matches: GematriaMatch[];
    error: string | null;
  } | null>(null);
  const gematriaPanelRef = useRef<HTMLDivElement>(null);
  const wordStripRef = useRef<HTMLDivElement>(null);
  const activeWordRef = useRef<HTMLButtonElement | null>(null);
  const isHebrew = language === "hebrew";

  const activeWord = words[activeIndex] ?? words[0];
  const verseStrongs = activeWord?.strongs ?? "";
  const analysisWord = analysisFocus ?? activeWord;
  const activeStrongs = analysisWord?.strongs ?? "";
  const analysisText = analysisWord?.text ?? "";
  const analysisGloss = analysisWord?.gloss ?? null;
  const dictionaryUrl = verseStrongs
    ? getDictionaryUrl(verseStrongs)
    : "";
  const mobileUrl = dictionaryUrl
    ? toMobileDictionaryUrl(dictionaryUrl)
    : "";

  const letterAnalysis = useMemo(
    () =>
      isHebrew && analysisText
        ? analyzeHebrewWordLetters(analysisText)
        : [],
    [isHebrew, analysisText],
  );
  const letterValueSum = useMemo(
    () => sumHebrewLetterValues(letterAnalysis),
    [letterAnalysis],
  );

  const strongsDefinition =
    fetchedDefinition?.strongs === activeStrongs
      ? fetchedDefinition.data
      : null;
  const rootText =
    isHebrew && strongsDefinition?.original?.trim()
      ? strongsDefinition.original.trim()
      : null;
  const rootLetters = useMemo(
    () => (rootText ? analyzeHebrewWordLetters(rootText) : []),
    [rootText],
  );
  const rootValueSum = useMemo(
    () => sumHebrewLetterValues(rootLetters),
    [rootLetters],
  );
  const markedLetters = useMemo(
    () => markSurfaceLettersWithRoot(letterAnalysis, rootLetters),
    [letterAnalysis, rootLetters],
  );
  const hasRoot = rootLetters.length > 0;
  const definitionError =
    fetchedDefinition?.strongs === activeStrongs
      ? fetchedDefinition.error
      : null;
  const showDefinitionLoading =
    Boolean(activeStrongs) &&
    isLinkableStrongs(activeStrongs) &&
    fetchedDefinition?.strongs !== activeStrongs;
  const wordDescription =
    strongsDefinition?.definition?.trim() ||
    strongsDefinition?.gloss?.trim() ||
    (!showDefinitionLoading ? analysisGloss?.trim() || null : null);
  const showDefinitionError =
    Boolean(definitionError) && !showDefinitionLoading && !wordDescription;
  const gematriaLoading =
    gematriaQuery !== null &&
    (gematriaFetch?.value !== gematriaQuery ||
      gematriaFetch?.page !== gematriaPage ||
      gematriaFetch?.filter !== gematriaFilter);
  const gematriaResult =
    gematriaQuery !== null &&
    gematriaFetch?.value === gematriaQuery &&
    gematriaFetch?.page === gematriaPage &&
    gematriaFetch?.filter === gematriaFilter
      ? gematriaFetch
      : null;

  const selectVerseWord = (index: number) => {
    setActiveIndex(index);
    setAnalysisFocus(null);
    setGematriaQuery(null);
    setGematriaPage(1);
  };

  const openGematriaMatches = (value: number) => {
    if (gematriaQuery === value) {
      setGematriaQuery(null);
      setGematriaPage(1);
      setGematriaFilter("all");
      return;
    }
    setGematriaPage(1);
    setGematriaFilter("all");
    setGematriaQuery(value);
  };

  const searchStrongsVerses = (strongs: string) => {
    if (!isLinkableStrongs(strongs)) return;
    openSearch(strongs);
  };

  const updateScrollState = useCallback(() => {
    const element = wordStripRef.current;
    if (!element) return;

    const first = element.firstElementChild;
    const last = element.lastElementChild;
    if (!(first instanceof HTMLElement) || !(last instanceof HTMLElement)) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }

    const containerRect = element.getBoundingClientRect();
    const firstRect = first.getBoundingClientRect();
    const lastRect = last.getBoundingClientRect();
    const contentLeft = Math.min(firstRect.left, lastRect.left);
    const contentRight = Math.max(firstRect.right, lastRect.right);

    setCanScrollLeft(contentLeft < containerRect.left - 1);
    setCanScrollRight(contentRight > containerRect.right + 1);
  }, []);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSearchOpenRef.current) onClose();
    };

    const unlock = lockBodyScroll();
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      unlock();
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const closeFromSearchNavigate = () => onClose();
    window.addEventListener(
      "bible4korea:close-overlays",
      closeFromSearchNavigate,
    );
    return () => {
      window.removeEventListener(
        "bible4korea:close-overlays",
        closeFromSearchNavigate,
      );
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !activeStrongs || !isLinkableStrongs(activeStrongs)) {
      return;
    }

    const controller = new AbortController();
    const requestStrongs = activeStrongs;

    fetch(`/api/strongs/${encodeURIComponent(requestStrongs)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(body?.error ?? "단어 설명을 불러오지 못했습니다.");
        }
        return response.json() as Promise<StrongsDefinition>;
      })
      .then((data) => {
        setFetchedDefinition({
          strongs: requestStrongs,
          data,
          error: null,
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setFetchedDefinition({
          strongs: requestStrongs,
          data: null,
          error:
            error instanceof Error
              ? error.message
              : "단어 설명을 불러오지 못했습니다.",
        });
      });

    return () => controller.abort();
  }, [open, activeStrongs]);

  useEffect(() => {
    if (gematriaQuery === null) return;

    const controller = new AbortController();
    const value = gematriaQuery;
    const page = gematriaPage;
    const filter = gematriaFilter;
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", "10");
    params.set("filter", filter);
    if (activeStrongs && isLinkableStrongs(activeStrongs)) {
      params.set("source", activeStrongs);
      params.set("exclude", activeStrongs);
    }

    fetch(`/api/strongs/gematria/${value}?${params.toString()}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(body?.error ?? "같은 수치의 단어를 찾지 못했습니다.");
        }
        return response.json() as Promise<{
          value: number;
          page: number;
          total: number;
          totalPages: number;
          filter: GematriaFilter;
          sourceRootText: string | null;
          counts: { all: number; root: number; number: number };
          matches: GematriaMatch[];
        }>;
      })
      .then((data) => {
        setGematriaFetch({
          value: data.value,
          page: data.page,
          total: data.total,
          totalPages: data.totalPages,
          filter: data.filter ?? filter,
          sourceRootText: data.sourceRootText ?? null,
          counts: data.counts ?? {
            all: data.total,
            root: 0,
            number: data.total,
          },
          matches: data.matches,
          error: null,
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setGematriaFetch({
          value,
          page,
          total: 0,
          totalPages: 1,
          filter,
          sourceRootText: null,
          counts: { all: 0, root: 0, number: 0 },
          matches: [],
          error:
            error instanceof Error
              ? error.message
              : "같은 수치의 단어를 찾지 못했습니다.",
        });
      });

    return () => controller.abort();
  }, [gematriaQuery, gematriaPage, gematriaFilter, activeStrongs]);

  useLayoutEffect(() => {
    if (gematriaQuery === null || !gematriaPanelRef.current) return;
    gematriaPanelRef.current.scrollIntoView({
      block: "nearest",
      behavior: "smooth",
    });
  }, [gematriaQuery, gematriaResult]);

  useEffect(() => {
    if (!open) return;

    updateScrollState();

    const element = wordStripRef.current;
    if (!element) return;

    element.addEventListener("scroll", updateScrollState, { passive: true });
    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(element);

    return () => {
      element.removeEventListener("scroll", updateScrollState);
      resizeObserver.disconnect();
    };
  }, [open, words, activeIndex, updateScrollState]);

  useLayoutEffect(() => {
    if (!open || !activeWordRef.current) return;

    activeWordRef.current.scrollIntoView({
      block: "nearest",
      inline: "nearest",
      behavior: "smooth",
    });
  }, [open, activeIndex]);

  const scrollWords = (direction: "left" | "right") => {
    const element = wordStripRef.current;
    if (!element) return;

    const amount = Math.max(160, Math.round(element.clientWidth * 0.7));
    element.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  if (!open || !activeWord) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-stretch justify-center p-0 sm:items-center sm:p-6">
      <div
        aria-hidden="true"
        className="absolute inset-0 hidden bg-stone-900/40 backdrop-blur-[1px] sm:block"
      />

      <div
        className={`relative flex h-full w-full max-w-none flex-col overflow-hidden bg-background sm:max-h-[85vh] sm:max-w-2xl sm:rounded-2xl sm:border sm:border-border sm:shadow-2xl ${SAFE_AREA.modal}`}
      >
        <div className="border-b border-stone-200/80 px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="min-w-0 font-serif text-lg font-bold text-stone-900">
              {(() => {
                const headerStrongs =
                  activeTab === "analysis" ? activeStrongs : verseStrongs;
                if (!isLinkableStrongs(headerStrongs)) {
                  return headerStrongs;
                }
                return (
                  <button
                    type="button"
                    onClick={() => searchStrongsVerses(headerStrongs)}
                    title={`${headerStrongs} 구절 검색`}
                    className="cursor-pointer underline-offset-2 transition-colors hover:text-amber-900 hover:underline"
                  >
                    {headerStrongs}
                  </button>
                );
              })()}
            </h2>
            <div className="flex shrink-0 items-center gap-1">
              {activeTab === "dictionary" && dictionaryUrl && (
                <a
                  href={dictionaryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cursor-pointer rounded-lg px-2 py-1 text-sm text-amber-800 transition-colors hover:bg-amber-50 hover:text-amber-900"
                >
                  새 창
                </a>
              )}
              <button
                type="button"
                onClick={onClose}
                className="cursor-pointer rounded-lg px-2 py-1 text-sm text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-800"
              >
                닫기
              </button>
            </div>
          </div>
        </div>

        <div className="border-b border-stone-200/80 px-3 py-3 sm:px-4">
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="이전 단어"
              onClick={() => scrollWords("left")}
              disabled={!canScrollLeft}
              className="hidden shrink-0 cursor-pointer items-center justify-center rounded-lg border border-stone-200 bg-white p-1.5 text-stone-500 transition-colors enabled:hover:bg-stone-50 enabled:hover:text-stone-800 disabled:cursor-not-allowed disabled:opacity-30 sm:inline-flex"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>

            <div
              ref={wordStripRef}
              dir={isHebrew ? "rtl" : "ltr"}
              lang={isHebrew ? "he" : "el"}
              className="flex min-w-0 flex-1 flex-nowrap gap-x-2 overflow-x-auto overscroll-x-contain scroll-smooth p-[2px] [scrollbar-width:none] sm:gap-x-3 [&::-webkit-scrollbar]:hidden"
            >
              {words.map((word, index) => {
                const isPlaceholderStrongs =
                  isHebrew && isNonNumericHebrewStrongs(word.strongs);
                const hasLinkableStrongs = isLinkableStrongs(word.strongs);
                const isActive = index === activeIndex;

                const wordTextClassName = `block whitespace-nowrap text-center leading-snug ${
                  isActive ? "text-amber-950" : "text-stone-600"
                } ${
                  isHebrew
                    ? "text-reading-original font-hebrew"
                    : "text-reading-original font-greek"
                }`;

                const content = (
                  <>
                    <span className={wordTextClassName}>{word.text}</span>
                    {(hasLinkableStrongs || isPlaceholderStrongs) && (
                      <span
                        dir="ltr"
                        lang="en"
                        className={`text-reading-meta mt-0.5 block whitespace-nowrap text-center font-mono font-medium tracking-tight ${
                          isActive
                            ? "font-semibold text-amber-950"
                            : "text-amber-800/75"
                        }`}
                      >
                        {isPlaceholderStrongs ? "-" : word.strongs}
                      </span>
                    )}
                    {(isPlaceholderStrongs || word.gloss) && (
                      <span
                        dir="ltr"
                        lang="ko"
                        className="text-reading-meta mt-0.5 block whitespace-nowrap text-center leading-tight text-stone-500"
                      >
                        {isPlaceholderStrongs ? "-" : word.gloss}
                      </span>
                    )}
                  </>
                );

                if (!hasLinkableStrongs) {
                  return (
                    <div
                      key={`${word.text}-${word.strongs}-${index}`}
                      className="inline-flex w-fit max-w-full shrink-0 flex-col items-center rounded-lg px-1.5 py-1 text-center"
                    >
                      {content}
                    </div>
                  );
                }

                return (
                  <button
                    key={`${word.strongs}-${index}`}
                    ref={isActive ? activeWordRef : undefined}
                    type="button"
                    title={
                      word.gloss
                        ? `${word.strongs} · ${word.gloss}`
                        : `${word.strongs} 사전 검색`
                    }
                    aria-pressed={isActive}
                    onClick={() => selectVerseWord(index)}
                    className={`group inline-flex w-fit max-w-full shrink-0 cursor-pointer flex-col items-center rounded-lg px-1.5 py-1 text-center transition-colors ${
                      isActive
                        ? strongsWordHighlightClassName
                        : "hover:bg-amber-50"
                    }`}
                  >
                    {content}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              aria-label="다음 단어"
              onClick={() => scrollWords("right")}
              disabled={!canScrollRight}
              className="hidden shrink-0 cursor-pointer items-center justify-center rounded-lg border border-stone-200 bg-white p-1.5 text-stone-500 transition-colors enabled:hover:bg-stone-50 enabled:hover:text-stone-800 disabled:cursor-not-allowed disabled:opacity-30 sm:inline-flex"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div
          role="tablist"
          aria-label="사전 보기 선택"
          className="flex border-b border-stone-200/80 px-4 sm:px-6"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "dictionary"}
            onClick={() => setActiveTab("dictionary")}
            className={`cursor-pointer border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
              activeTab === "dictionary"
                ? "border-amber-800 text-amber-900"
                : "border-transparent text-stone-500 hover:text-stone-800"
            }`}
          >
            네이버 사전
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "analysis"}
            onClick={() => setActiveTab("analysis")}
            className={`cursor-pointer border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
              activeTab === "analysis"
                ? "border-amber-800 text-amber-900"
                : "border-transparent text-stone-500 hover:text-stone-800"
            }`}
          >
            단어 분석
          </button>
        </div>

        {activeTab === "dictionary" ? (
          <div className="min-h-0 flex-1 bg-white">
            <iframe
              key={mobileUrl}
              src={mobileUrl}
              title={`${verseStrongs} 원어 사전`}
              className="h-full w-full border-0"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto bg-background px-4 py-4 sm:px-6">
            <div className="flex flex-col gap-4">
              {analysisFocus && (
                <button
                  type="button"
                  onClick={() => {
                    setAnalysisFocus(null);
                    setGematriaQuery(null);
                    setGematriaPage(1);
                  }}
                  className="w-fit cursor-pointer rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-900 transition-colors hover:bg-amber-100"
                >
                  구절 단어로 돌아가기
                </button>
              )}

              <div className="flex flex-col gap-3 rounded-xl border border-amber-200/70 bg-amber-50/60 px-4 py-3 text-sm leading-relaxed text-amber-950/80">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span
                    dir={isHebrew ? "rtl" : "ltr"}
                    lang={isHebrew ? "he" : "el"}
                    className={`text-2xl text-amber-950 ${
                      isHebrew ? "font-hebrew" : "font-greek"
                    }`}
                  >
                    {analysisText}
                  </span>
                  {isLinkableStrongs(activeStrongs) ? (
                    <button
                      type="button"
                      onClick={() => searchStrongsVerses(activeStrongs)}
                      title={`${activeStrongs} 구절 검색`}
                      className="cursor-pointer font-mono text-xs font-medium text-amber-800 underline-offset-2 transition-colors hover:text-amber-950 hover:underline"
                    >
                      {activeStrongs}
                    </button>
                  ) : (
                    <span className="font-mono text-xs font-medium text-amber-800/80">
                      {activeStrongs}
                    </span>
                  )}
                  {(strongsDefinition?.gloss || analysisGloss) && (
                    <span className="text-amber-900/70">
                      {strongsDefinition?.gloss || analysisGloss}
                    </span>
                  )}
                </div>

                {isHebrew && rootLetters.length > 0 && (
                  <div className="rounded-xl border border-amber-200/50 bg-white/70 px-3 py-3">
                    <p className="text-xs font-semibold tracking-wide text-amber-800/70">
                      어근 (Strong&apos;s)
                    </p>
                    <div className="mt-2 flex flex-wrap items-end gap-2">
                      <span
                        dir="rtl"
                        lang="he"
                        className="me-1 font-hebrew text-xl text-amber-950"
                      >
                        {rootText}
                      </span>
                      <div
                        dir="rtl"
                        className="flex flex-wrap items-stretch gap-1.5"
                      >
                        {rootLetters.map((item, index) => (
                          <div
                            key={`${item.letter}-${index}`}
                            className="flex min-w-[2.75rem] flex-col items-center rounded-lg border border-amber-100 bg-amber-50/80 px-2 py-1.5"
                          >
                            <span className="font-hebrew text-lg leading-none text-stone-800">
                              {item.letter}
                            </span>
                            {item.entry ? (
                              <button
                                type="button"
                                onClick={() =>
                                  openGematriaMatches(item.entry!.value)
                                }
                                className={`mt-1 cursor-pointer font-mono text-xs font-semibold underline-offset-2 hover:underline ${
                                  gematriaQuery === item.entry.value
                                    ? "text-amber-900"
                                    : "text-amber-800/80"
                                }`}
                                title={`${item.entry.value} 같은 수치 단어 보기`}
                              >
                                {item.entry.value}
                              </button>
                            ) : (
                              <span className="mt-1 text-xs text-stone-400">
                                —
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="flex min-w-[2.75rem] flex-col items-center rounded-lg border border-amber-200 bg-amber-100/70 px-2 py-1.5">
                        <span className="text-[10px] font-medium tracking-wide text-amber-800/70">
                          합계
                        </span>
                        <button
                          type="button"
                          onClick={() => openGematriaMatches(rootValueSum)}
                          className={`mt-1 cursor-pointer font-mono text-xs font-bold underline-offset-2 hover:underline ${
                            gematriaQuery === rootValueSum
                              ? "text-amber-950"
                              : "text-amber-900"
                          }`}
                          title={`${rootValueSum} 같은 수치 단어 보기`}
                        >
                          {rootValueSum}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {showDefinitionLoading && (
                  <p className="text-amber-900/60">단어 설명 불러오는 중…</p>
                )}

                {showDefinitionError && (
                  <p className="text-red-600">{definitionError}</p>
                )}

                {!showDefinitionLoading && wordDescription && (
                  <div>
                    <p className="text-xs font-semibold tracking-wide text-amber-800/70">
                      단어 설명
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-amber-950/90">
                      {wordDescription}
                    </p>
                  </div>
                )}
              </div>

              {!isHebrew ? (
                <p className="py-6 text-center text-sm text-stone-500">
                  글자별 상형 분석은 히브리어 단어에 지원됩니다.
                </p>
              ) : markedLetters.length === 0 ? (
                <p className="py-6 text-center text-sm text-stone-500">
                  분석할 히브리어 자음을 찾지 못했습니다.
                </p>
              ) : (
                <LetterAnalysisTable
                  wordText={analysisText}
                  rootText={rootText}
                  letters={markedLetters}
                  surfaceValueSum={letterValueSum}
                  rootValueSum={rootValueSum}
                  hasRoot={hasRoot}
                  gematriaQuery={gematriaQuery}
                  onOpenGematria={openGematriaMatches}
                />
              )}

              {gematriaQuery !== null && (
                <div
                  ref={gematriaPanelRef}
                  className={`${featuredPanelClassName} px-4 py-4`}
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold tracking-wide text-amber-800/70">
                        게마트리아 매치
                      </p>
                      <h3 className="mt-1 font-serif text-base font-bold text-stone-900">
                        수치 {gematriaQuery}
                        {gematriaResult?.sourceRootText ? (
                          <span
                            dir="rtl"
                            lang="he"
                            className="ms-2 font-hebrew text-sm font-semibold text-amber-800/80"
                          >
                            {gematriaResult.sourceRootText}
                          </span>
                        ) : null}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setGematriaQuery(null);
                        setGematriaFilter("all");
                        setGematriaPage(1);
                      }}
                      className="cursor-pointer rounded-lg px-2 py-1 text-sm text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-800"
                    >
                      닫기
                    </button>
                  </div>

                  <div
                    className="mb-3 flex flex-wrap gap-1.5"
                    role="tablist"
                    aria-label="게마트리아 매치 필터"
                  >
                    {(
                      [
                        {
                          id: "all" as const,
                          label: "전체",
                          count: gematriaResult?.counts.all,
                        },
                        {
                          id: "root" as const,
                          label: "동일 어근 계열",
                          count: gematriaResult?.counts.root,
                        },
                        {
                          id: "number" as const,
                          label: "수치 매치",
                          count: gematriaResult?.counts.number,
                        },
                      ] as const
                    ).map((tab) => {
                      const active = gematriaFilter === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          onClick={() => {
                            setGematriaFilter(tab.id);
                            setGematriaPage(1);
                          }}
                          className={`cursor-pointer rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                            active
                              ? "bg-amber-800 text-white"
                              : "border border-amber-100 bg-white/70 text-stone-600 hover:bg-amber-50/80 dark:border-border dark:bg-transparent dark:hover:bg-white/5"
                          }`}
                        >
                          {tab.label}
                          {typeof tab.count === "number" ? (
                            <span
                              className={`ms-1 tabular-nums ${
                                active ? "text-white/80" : "text-stone-400"
                              }`}
                            >
                              {tab.count}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>

                  {(gematriaFilter === "number" ||
                    gematriaFilter === "all") && (
                    <p className="mb-3 text-[11px] leading-relaxed text-stone-500">
                      ※ 단순 수치 일치 단어는 어원적 연관성이 다를 수 있습니다.
                    </p>
                  )}

                  {gematriaLoading && (
                    <p className="py-6 text-center text-sm text-stone-500">
                      같은 수치의 단어를 찾는 중…
                    </p>
                  )}

                  {!gematriaLoading && gematriaResult?.error && (
                    <p className="py-6 text-center text-sm text-red-600">
                      {gematriaResult.error}
                    </p>
                  )}

                  {!gematriaLoading &&
                    gematriaResult &&
                    !gematriaResult.error &&
                    gematriaResult.matches.length === 0 && (
                      <p className="py-6 text-center text-sm text-stone-500">
                        {gematriaFilter === "root"
                          ? "동일 어근 계열의 다른 단어가 없습니다."
                          : gematriaFilter === "number"
                            ? "단순 수치 일치 단어가 없습니다."
                            : "같은 수치의 다른 단어가 없습니다."}
                      </p>
                    )}

                  {!gematriaLoading &&
                    gematriaResult &&
                    gematriaResult.matches.length > 0 && (
                      <>
                        <p className="mb-3 text-sm text-stone-500">
                          {gematriaResult.total}개 ·{" "}
                          {(gematriaResult.page - 1) * 10 + 1}–
                          {Math.min(
                            gematriaResult.page * 10,
                            gematriaResult.total,
                          )}
                          표시 · 단어를 누르면 분석합니다
                        </p>
                        <ul className="divide-y divide-stone-100/80 dark:divide-border">
                          {gematriaResult.matches.map((match) => {
                            const isSameRoot = match.matchKind === "root";
                            return (
                              <li key={match.strongs}>
                                <div className="flex w-full flex-wrap items-baseline gap-x-3 gap-y-1 px-1 py-2.5">
                                  <span
                                    className={`inline-flex shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold tracking-tight ${
                                      isSameRoot
                                        ? "bg-amber-100/90 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100"
                                        : "bg-stone-100 text-stone-600 dark:bg-stone-800/80 dark:text-stone-300"
                                    }`}
                                  >
                                    {isSameRoot ? "동일 어근" : "수치 일치"}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setAnalysisFocus({
                                        strongs: match.strongs,
                                        text: match.original,
                                        gloss: match.gloss,
                                      });
                                      setGematriaQuery(null);
                                      setGematriaFilter("all");
                                      setGematriaPage(1);
                                    }}
                                    className="shrink-0 cursor-pointer font-hebrew text-lg text-stone-800 transition-colors hover:text-amber-900"
                                    title="단어 분석"
                                  >
                                    <span dir="rtl" lang="he">
                                      {match.original}
                                    </span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      searchStrongsVerses(match.strongs)
                                    }
                                    title={`${match.strongs} 구절 검색`}
                                    className="shrink-0 cursor-pointer font-mono text-xs font-medium text-amber-800 underline-offset-2 transition-colors hover:text-amber-950 hover:underline"
                                  >
                                    {match.strongs}
                                  </button>
                                  {match.gloss && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setAnalysisFocus({
                                          strongs: match.strongs,
                                          text: match.original,
                                          gloss: match.gloss,
                                        });
                                        setGematriaQuery(null);
                                        setGematriaFilter("all");
                                        setGematriaPage(1);
                                      }}
                                      className="min-w-0 cursor-pointer text-left text-sm text-stone-600 transition-colors hover:text-stone-900"
                                    >
                                      {match.gloss}
                                    </button>
                                  )}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                        {gematriaResult.totalPages > 1 && (
                          <div className="mt-4 flex items-center justify-between gap-3 border-t border-stone-100/80 pt-3 dark:border-border">
                            <button
                              type="button"
                              disabled={gematriaPage <= 1}
                              onClick={() =>
                                setGematriaPage((page) => Math.max(1, page - 1))
                              }
                              className="cursor-pointer rounded-lg border border-amber-100 bg-white/80 px-3 py-1.5 text-sm text-stone-700 transition-colors enabled:hover:bg-amber-50/60 disabled:cursor-not-allowed disabled:opacity-40 dark:border-border dark:bg-transparent"
                            >
                              이전
                            </button>
                            <p className="text-sm text-stone-500">
                              {gematriaPage} / {gematriaResult.totalPages}페이지
                            </p>
                            <button
                              type="button"
                              disabled={
                                gematriaPage >= gematriaResult.totalPages
                              }
                              onClick={() =>
                                setGematriaPage((page) =>
                                  Math.min(
                                    gematriaResult.totalPages,
                                    page + 1,
                                  ),
                                )
                              }
                              className="cursor-pointer rounded-lg border border-amber-100 bg-white/80 px-3 py-1.5 text-sm text-stone-700 transition-colors enabled:hover:bg-amber-50/60 disabled:cursor-not-allowed disabled:opacity-40 dark:border-border dark:bg-transparent"
                            >
                              다음
                            </button>
                          </div>
                        )}
                      </>
                    )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
