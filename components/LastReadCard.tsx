"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ChevronRightIcon } from "@/components/ChevronIcons";
import {
  featuredBodyClassName,
  featuredLabelClassName,
  featuredPanelClassName,
} from "@/lib/featured-panel";
import {
  formatLastReadReference,
  getLastReadChapters,
  getLastReadHref,
  LAST_READ_UPDATED_EVENT,
  type LastReadChapter,
} from "@/lib/last-read";

function formatReadAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("ko-KR", {
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function LastReadCard() {
  const [lastReadList, setLastReadList] = useState<LastReadChapter[]>([]);

  const refresh = useCallback(() => {
    setLastReadList(getLastReadChapters());
  }, []);

  useEffect(() => {
    refresh();

    window.addEventListener(LAST_READ_UPDATED_EVENT, refresh);
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener(LAST_READ_UPDATED_EVENT, refresh);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", refresh);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refresh]);

  if (lastReadList.length === 0) return null;

  const [latest, ...rest] = lastReadList;

  return (
    <section className="mb-13 rounded-2xl border border-stone-200/80 bg-white py-6 px-4 sm:p-8">
      <p className="mb-4 text-xs font-medium uppercase tracking-wider text-stone-500">
        최근 읽은 말씀
      </p>

      <div className={`${featuredPanelClassName} py-5 px-4 sm:p-5`}>
        <p className={`${featuredLabelClassName} uppercase tracking-wider`}>
          가장 최근
        </p>
        <h2 className="mt-1 font-serif text-xl font-bold text-stone-900 sm:text-2xl">
          {formatLastReadReference(latest)}
        </h2>
        {latest.koreanText && (
          <blockquote
            className={`mt-3 text-base sm:text-lg ${featuredBodyClassName}`}
          >
            &ldquo;{latest.koreanText}&rdquo;
          </blockquote>
        )}
        {latest.readAt && (
          <p className="mt-2 text-sm text-stone-500">
            {formatReadAt(latest.readAt)}
          </p>
        )}
        <Link
          href={getLastReadHref(latest)}
          className="mt-4 inline-flex items-center rounded-xl bg-amber-800 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-amber-900"
        >
          이어서 읽기
        </Link>
      </div>

      {rest.length > 0 && (
        <ul className="mt-4">
          {rest.map((item, index) => (
            <li
              key={`${item.bookSlug}-${item.chapter}`}
              className={
                index === 0 ? undefined : "last-read-item-divider border-t"
              }
            >
              <Link
                href={getLastReadHref(item)}
                className="block py-3 transition-colors hover:text-amber-900"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="inline-flex items-center gap-1 font-medium text-stone-800">
                    {formatLastReadReference(item)}
                    <ChevronRightIcon className="h-4 w-4 shrink-0 text-stone-400" />
                  </span>
                  <span className="shrink-0 text-xs text-stone-400">
                    {formatReadAt(item.readAt)}
                  </span>
                </div>
                {item.koreanText && (
                  <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-stone-500">
                    {item.koreanText}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
