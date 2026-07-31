"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  ActivityRankingItem,
  ActivityRankingResponse,
} from "@/lib/activity-ranking";
import {
  homeSectionMetaLabelClassName,
  homeSectionTitleClassName,
} from "@/lib/featured-panel";
import { authenticatedFetch } from "@/lib/authenticated-fetch";

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
  const params = new URLSearchParams({
    offset: String(offset),
    limit: String(PAGE_SIZE),
  });

  const response = await authenticatedFetch(
    `/api/ranking?${params.toString()}`,
    { cache: "no-store" },
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

export function ActivityRanking({
  onSearchOrganization,
  onCreateOrganization,
}: {
  onSearchOrganization: () => void;
  onCreateOrganization: () => void;
}) {
  const [items, setItems] = useState<ActivityRankingItem[]>([]);
  const [total, setTotal] = useState(0);
  const [weekLabel, setWeekLabel] = useState("");
  const [organizationName, setOrganizationName] =
    useState<string | null>(null);
  const [membershipStatus, setMembershipStatus] = useState<
    ActivityRankingResponse["membershipStatus"]
  >(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);

  const loadRanking = useCallback(
    async (offset: number, append: boolean) => {
      const data = await fetchRanking(offset);
      setError(false);
      setItems((current) =>
        append ? [...current, ...data.items] : data.items,
      );
      setTotal(data.total);
      setWeekLabel(data.weekLabel);
      setOrganizationName(data.organizationName);
      setMembershipStatus(data.membershipStatus);
    },
    [],
  );

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(async () => {
      if (!active) return;
      setLoading(true);
      try {
        await loadRanking(0, false);
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [loadRanking]);

  const loadMore = async () => {
    setLoadingMore(true);
    setError(false);
    try {
      await loadRanking(items.length, true);
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
      <div className="mb-5">
        {organizationName && (
          <p className={homeSectionMetaLabelClassName}>
            {organizationName}
          </p>
        )}
        <h2
          id="activity-ranking-title"
          className={
            organizationName
              ? homeSectionTitleClassName
              : "font-serif text-base font-bold text-stone-900 dark:text-stone-100 sm:text-lg"
          }
        >
          이번 주 말씀 읽기 순위
        </h2>
        {weekLabel && (
          <p className="mt-1 text-xs text-stone-400">{weekLabel}</p>
        )}
      </div>

      {!loading && !organizationName ? (
        <div className="mb-4 rounded-xl border border-dashed border-stone-200 px-4 py-5 text-center dark:border-stone-700">
          <p className="text-sm text-stone-500 dark:text-stone-400">
            모임에 가입하면 순위를 볼 수 있습니다.
          </p>
          <div className="mt-3 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={onSearchOrganization}
              className="cursor-pointer text-xs font-semibold text-muted underline-offset-4 transition-colors hover:text-amber-800 hover:underline dark:hover:text-amber-300"
            >
              모임 검색
            </button>
            <span aria-hidden className="text-xs text-border">
              ·
            </span>
            <button
              type="button"
              onClick={onCreateOrganization}
              className="cursor-pointer text-xs font-semibold text-muted underline-offset-4 transition-colors hover:text-amber-800 hover:underline dark:hover:text-amber-300"
            >
              모임 만들기
            </button>
          </div>
        </div>
      ) : !loading && membershipStatus === "pending" ? (
        <p className="rounded-xl border border-dashed border-stone-200 px-4 py-8 text-center text-sm leading-6 text-stone-500 dark:border-stone-700 dark:text-stone-400">
          모임장의 가입 승인을 기다리고 있습니다.
        </p>
      ) : loading ? (
        <RankingSkeleton />
      ) : items.length === 0 && !error ? (
        <p className="rounded-xl border border-dashed border-stone-200 px-4 py-8 text-center text-sm text-stone-500 dark:border-stone-700 dark:text-stone-400">
          같은 모임의 읽기 기록이 아직 없습니다.
        </p>
      ) : (
        <ol className="space-y-2">
          {items.map((item) => (
            <li key={item.rank}>
              <div
                className="flex min-h-14 w-full items-center gap-3 rounded-xl border border-stone-100 px-3 py-2.5 text-left dark:border-stone-800 sm:px-4"
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${rankBadgeClassName(item.rank)}`}
                  aria-label={`${item.rank}등`}
                >
                  {item.rank}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-stone-800 dark:text-stone-200">
                  <span className="font-semibold">{item.displayName}</span>
                </span>
                <span className="shrink-0 text-sm font-normal text-stone-500 dark:text-stone-400">
                  총 {item.readCount}절 읽음
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}

      {error && (
        <p className="mt-4 text-center text-sm text-rose-600 dark:text-rose-400">
          말씀 활동을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
        </p>
      )}

      {membershipStatus === "approved" &&
        !loading &&
        items.length < total && (
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
