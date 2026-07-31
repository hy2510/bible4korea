"use client";

import { useEffect, useState } from "react";
import type { ActivityRankingUserSummary } from "@/lib/activity-ranking";
import { authenticatedFetch } from "@/lib/authenticated-fetch";

export function useActivityRankingUserSummary(username: string | null) {
  const [summary, setSummary] =
    useState<ActivityRankingUserSummary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!username) return;

    const controller = new AbortController();

    void authenticatedFetch(`/api/ranking/${encodeURIComponent(username)}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = (await response.json().catch(() => null)) as
          | ActivityRankingUserSummary
          | { error?: string }
          | null;
        if (!response.ok) {
          throw new Error(
            data && "error" in data && data.error
              ? data.error
              : "말씀 읽기 활동을 불러오지 못했습니다.",
          );
        }
        setSummary(data as ActivityRankingUserSummary);
      })
      .catch((fetchError: unknown) => {
        if (controller.signal.aborted) return;
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "말씀 읽기 활동을 불러오지 못했습니다.",
        );
      });

    return () => controller.abort();
  }, [username]);

  return { summary, error };
}
