"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ChevronIcons";
import { lockBodyScroll } from "@/lib/body-scroll-lock";
import {
  groupCommentariesByCommentator,
  type SefariaCommentary,
  type SefariaCommentatorGroup,
} from "@/lib/sefaria";
import { SAFE_AREA } from "@/lib/safe-area";
import { stripHtml } from "@/lib/translate-ko";

interface SefariaCommentaryModalProps {
  open: boolean;
  bookName: string;
  bookSlug: string;
  chapter: number;
  verse: number;
  onClose: () => void;
}

function CommentaryActions({
  sefariaUrl,
  translating,
  showKorean,
  copied,
  onCopy,
  onTranslateToggle,
}: {
  sefariaUrl: string;
  translating: boolean;
  showKorean: boolean;
  copied: boolean;
  onCopy: () => void;
  onTranslateToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <a
        href={sefariaUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-amber-800 underline-offset-2 hover:underline dark:text-amber-500/90"
      >
        Sefaria에서 보기
      </a>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onCopy}
          className="cursor-pointer text-xs font-medium text-amber-800 underline-offset-2 hover:underline dark:text-amber-500/90"
        >
          {copied ? "복사됨" : "복사"}
        </button>
        <button
          type="button"
          onClick={onTranslateToggle}
          disabled={translating}
          className="cursor-pointer text-xs font-medium text-amber-800 underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-50 dark:text-amber-500/90"
        >
          {translating ? "번역 중…" : showKorean ? "원문" : "번역"}
        </button>
      </div>
    </div>
  );
}

function CommentarySegment({ commentary }: { commentary: SefariaCommentary }) {
  const [showKorean, setShowKorean] = useState(false);
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) {
        clearTimeout(copiedTimeoutRef.current);
      }
    };
  }, []);

  const getDisplayText = () => {
    if (showKorean && translatedText) return translatedText;
    return stripHtml(commentary.text);
  };

  const handleCopy = async () => {
    const text = getDisplayText().trim();
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }

    setCopied(true);
    if (copiedTimeoutRef.current) {
      clearTimeout(copiedTimeoutRef.current);
    }
    copiedTimeoutRef.current = setTimeout(() => {
      setCopied(false);
      copiedTimeoutRef.current = null;
    }, 3000);
  };

  const handleTranslateToggle = async () => {
    if (showKorean) {
      setShowKorean(false);
      return;
    }

    if (translatedText) {
      setShowKorean(true);
      return;
    }

    setTranslating(true);
    setTranslateError(null);

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texts: [commentary.text] }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "번역에 실패했습니다.");
      }

      const data = (await response.json()) as { translations: string[] };
      const korean = data.translations[0]?.trim();

      if (!korean) {
        throw new Error("번역 결과가 없습니다.");
      }

      setTranslatedText(korean);
      setShowKorean(true);
    } catch (error) {
      setTranslateError(
        error instanceof Error ? error.message : "번역에 실패했습니다.",
      );
    } finally {
      setTranslating(false);
    }
  };

  const actionProps = {
    sefariaUrl: commentary.sefariaUrl,
    translating,
    showKorean,
    copied,
    onCopy: () => void handleCopy(),
    onTranslateToggle: () => void handleTranslateToggle(),
  };

  return (
    <article className="rounded-xl border border-border bg-surface px-4 py-3">
      <CommentaryActions {...actionProps} />

      <div className="mt-3">
        {showKorean && translatedText ? (
          <p
            className="sefaria-commentary whitespace-pre-wrap text-sm leading-relaxed text-foreground"
            lang="ko"
          >
            {translatedText}
          </p>
        ) : (
          <div
            className="sefaria-commentary text-sm leading-relaxed text-foreground"
            lang="en"
            dangerouslySetInnerHTML={{ __html: commentary.text }}
          />
        )}
      </div>

      {translateError && (
        <p className="mt-2 text-xs text-red-600">{translateError}</p>
      )}

      <div className="mt-3">
        <CommentaryActions {...actionProps} />
      </div>
    </article>
  );
}

function CommentatorTabBar({
  groups,
  activeCommentator,
  onSelect,
}: {
  groups: SefariaCommentatorGroup[];
  activeCommentator: string;
  onSelect: (commentator: string) => void;
}) {
  const tabListRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const element = tabListRef.current;
    if (!element) return;

    const maxScrollLeft = element.scrollWidth - element.clientWidth;
    setCanScrollLeft(element.scrollLeft > 1);
    setCanScrollRight(element.scrollLeft < maxScrollLeft - 1);
  }, []);

  useEffect(() => {
    updateScrollState();

    const element = tabListRef.current;
    if (!element) return;

    element.addEventListener("scroll", updateScrollState, { passive: true });
    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(element);

    return () => {
      element.removeEventListener("scroll", updateScrollState);
      resizeObserver.disconnect();
    };
  }, [groups, activeCommentator, updateScrollState]);

  useEffect(() => {
    const element = tabListRef.current;
    if (!element) return;
    const activeTab = element.querySelector<HTMLElement>(
      '[role="tab"][aria-selected="true"]',
    );
    activeTab?.scrollIntoView({ inline: "nearest", block: "nearest" });
  }, [activeCommentator]);

  const scrollTabs = (direction: "left" | "right") => {
    tabListRef.current?.scrollBy({
      left: direction === "left" ? -180 : 180,
      behavior: "smooth",
    });
  };

  return (
    <div className="flex items-center gap-1 border-b border-border px-2 py-2 sm:px-3">
      <button
        type="button"
        aria-label="이전 주석가 탭"
        onClick={() => scrollTabs("left")}
        disabled={!canScrollLeft}
        className="inline-flex shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border bg-surface p-1.5 text-muted transition-colors enabled:hover:bg-surface-muted enabled:hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
      >
        <ChevronLeftIcon className="h-4 w-4" />
      </button>

      <div
        ref={tabListRef}
        className="flex min-w-0 flex-1 gap-1 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="주석가 선택"
      >
        {groups.map((group) => {
          const active = group.commentator === activeCommentator;

          return (
            <button
              key={group.commentator}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onSelect(group.commentator)}
              className={`shrink-0 cursor-pointer rounded-lg px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors sm:text-sm ${
                active
                  ? "bg-amber-800 text-white shadow-sm"
                  : "text-muted hover:bg-surface-muted hover:text-foreground"
              }`}
            >
              {group.commentator}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        aria-label="다음 주석가 탭"
        onClick={() => scrollTabs("right")}
        disabled={!canScrollRight}
        className="inline-flex shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border bg-surface p-1.5 text-muted transition-colors enabled:hover:bg-surface-muted enabled:hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
      >
        <ChevronRightIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

export function SefariaCommentaryModal({
  open,
  bookName,
  bookSlug,
  chapter,
  verse,
  onClose,
}: SefariaCommentaryModalProps) {
  const [commentaries, setCommentaries] = useState<SefariaCommentary[]>([]);
  const [activeCommentator, setActiveCommentator] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const commentatorGroups = useMemo(
    () => groupCommentariesByCommentator(commentaries),
    [commentaries],
  );

  const activeGroup = useMemo(
    () =>
      commentatorGroups.find(
        (group) => group.commentator === activeCommentator,
      ) ?? commentatorGroups[0],
    [commentatorGroups, activeCommentator],
  );

  useEffect(() => {
    if (!open) return;

    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setCommentaries([]);
    setActiveCommentator("");

    fetch(`/api/sefaria/${bookSlug}/${chapter}/${verse}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(body?.error ?? "주석을 불러오지 못했습니다.");
        }
        return response.json() as Promise<{ commentaries: SefariaCommentary[] }>;
      })
      .then((data) => {
        setCommentaries(data.commentaries);
        const groups = groupCommentariesByCommentator(data.commentaries);
        setActiveCommentator(groups[0]?.commentator ?? "");
      })
      .catch((fetchError: unknown) => {
        if (controller.signal.aborted) return;
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "주석을 불러오지 못했습니다.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [open, bookSlug, chapter, verse]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
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

  if (!open) return null;

  const reference = `${bookName} ${chapter}:${verse}`;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-stretch justify-center p-0 sm:items-center sm:p-6">
      <div
        aria-hidden="true"
        className="absolute inset-0 hidden bg-stone-900/40 backdrop-blur-[1px] sm:block"
      />

      <div
        className={`relative flex h-full w-full max-w-none flex-col overflow-hidden bg-background sm:max-h-[85vh] sm:max-w-2xl sm:rounded-2xl sm:border sm:border-border sm:shadow-2xl ${SAFE_AREA.modal}`}
      >
        <div className="border-b border-border px-4 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wider text-muted">
                Sefaria 주석
              </p>
              <h2 className="mt-1 font-serif text-lg font-bold text-foreground">
                {reference}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-lg px-2 py-1 text-sm text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
            >
              닫기
            </button>
          </div>
        </div>

        {!loading && !error && commentatorGroups.length > 0 && (
          <CommentatorTabBar
            groups={commentatorGroups}
            activeCommentator={activeGroup?.commentator ?? ""}
            onSelect={setActiveCommentator}
          />
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          {loading && (
            <p className="py-10 text-center text-sm text-muted">
              주석 불러오는 중…
            </p>
          )}

          {!loading && error && (
            <p className="py-10 text-center text-sm text-red-600">{error}</p>
          )}

          {!loading && !error && commentaries.length === 0 && (
            <p className="py-10 text-center text-sm text-muted">
              이 구절에 연결된 영어 Sefaria 주석이 없습니다.
            </p>
          )}

          {!loading && !error && activeGroup && (
            <div>
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-500/90">
                  {activeGroup.commentator}
                  {activeGroup.commentatorHe && (
                    <span className="ms-2 font-normal text-muted">
                      {activeGroup.commentatorHe}
                    </span>
                  )}
                </h3>
              </div>

              <ul className="space-y-3">
                {activeGroup.commentaries.map((commentary) => (
                  <li key={commentary.id}>
                    <CommentarySegment commentary={commentary} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
