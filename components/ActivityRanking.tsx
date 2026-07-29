"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import type {
  ActivityRankingItem,
  ActivityRankingResponse,
} from "@/lib/activity-ranking";

const PAGE_SIZE = 5;

function rankBadgeClassName(rank: number) {
  if (rank === 1) {
    return "bg-amber-800 text-white dark:bg-amber-700";
  }
  if (rank <= 3) {
    return "bg-amber-100 text-amber-900 dark:bg-amber-900/45 dark:text-amber-200";
  }
  return "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300";
}

async function fetchRanking(offset: number): Promise<ActivityRankingResponse> {
  const response = await fetch(
    `/api/ranking?offset=${offset}&limit=${PAGE_SIZE}`,
  );
  if (!response.ok) throw new Error("말씀 활동 요청 실패");
  return (await response.json()) as ActivityRankingResponse;
}

function RankingSkeleton() {
  return (
    <div className="space-y-2" aria-label="말씀 활동을 불러오는 중">
      {Array.from({ length: PAGE_SIZE }, (_, index) => (
        <div
          key={index}
          className="h-14 animate-pulse rounded-xl bg-stone-100 dark:bg-stone-800/70"
        />
      ))}
    </div>
  );
}

export function ActivityRanking() {
  const { syncStatus } = useAuth();
  const [items, setItems] = useState<ActivityRankingItem[]>([]);
  const [total, setTotal] = useState(0);
  const [weekLabel, setWeekLabel] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;

    void fetchRanking(0)
      .then((data) => {
        if (!active) return;
        setError(false);
        setItems(data.items);
        setTotal(data.total);
        setWeekLabel(data.weekLabel);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [syncStatus]);

  const loadMore = async () => {
    setLoadingMore(true);
    setError(false);
    try {
      const data = await fetchRanking(items.length);
      setItems((current) => [...current, ...data.items]);
      setTotal(data.total);
      setWeekLabel(data.weekLabel);
    } catch {
      setError(true);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <section
      aria-labelledby="activity-ranking-title"
      className="mb-13 rounded-2xl border border-stone-200/80 bg-white px-4 py-6 dark:border-stone-800 dark:bg-stone-900/60 sm:p-8"
    >
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2
          id="activity-ranking-title"
          className="font-serif text-base font-bold text-stone-900 dark:text-stone-100 sm:text-lg"
        >
          말씀 읽기 순위
        </h2>
        {weekLabel && (
          <p className="shrink-0 text-xs text-stone-400">{weekLabel}</p>
        )}
      </div>

      {loading ? (
        <RankingSkeleton />
      ) : items.length === 0 && !error ? (
        <p className="rounded-xl border border-dashed border-stone-200 px-4 py-8 text-center text-sm text-stone-500 dark:border-stone-700 dark:text-stone-400">
          아직 표시할 읽기 기록이 없습니다.
        </p>
      ) : (
        <ol className="space-y-2">
          {items.map((item) => (
            <li
              key={item.username}
              className="flex min-h-14 items-center gap-3 rounded-xl border border-stone-100 px-3 py-2.5 dark:border-stone-800 sm:px-4"
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${rankBadgeClassName(item.rank)}`}
                aria-label={`${item.rank}등`}
              >
                {item.rank}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-stone-800 dark:text-stone-200">
                {item.username}
              </span>
              <span className="shrink-0 text-sm font-normal text-stone-500 dark:text-stone-400">
                총 {item.readCount}절 읽음
              </span>
            </li>
          ))}
        </ol>
      )}

      {error && (
        <p className="mt-4 text-center text-sm text-rose-600 dark:text-rose-400">
          말씀 활동을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
        </p>
      )}

      {!loading && items.length < total && (
        <button
          type="button"
          onClick={() => void loadMore()}
          disabled={loadingMore}
          className="mt-5 inline-flex min-h-10 w-full cursor-pointer items-center justify-center rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50 disabled:cursor-wait disabled:opacity-60 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
        >
          {loadingMore ? "불러오는 중…" : "더보기"}
        </button>
      )}
    </section>
  );
}
