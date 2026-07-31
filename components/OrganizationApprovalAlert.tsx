"use client";

import { useEffect, useState } from "react";
import { authenticatedFetch } from "@/lib/authenticated-fetch";
import type {
  OrganizationApprovalNotice,
  OrganizationApprovalNoticeResponse,
} from "@/lib/organizations";

export function OrganizationApprovalAlert() {
  const [notice, setNotice] =
    useState<OrganizationApprovalNotice | null>(null);
  const [dismissing, setDismissing] = useState(false);
  const [dismissError, setDismissError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    void Promise.resolve().then(async () => {
      try {
        const response = await authenticatedFetch(
          "/api/organizations/approval-notice",
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );
        const data = (await response.json().catch(() => null)) as
          | OrganizationApprovalNoticeResponse
          | null;
        if (!response.ok || controller.signal.aborted) return;
        setNotice(data?.notice ?? null);
      } catch {
        // 일시적인 네트워크 오류에는 홈 화면을 그대로 표시합니다.
      }
    });

    return () => controller.abort();
  }, []);

  const dismissNotice = async () => {
    if (dismissing) return;

    setDismissing(true);
    setDismissError("");
    try {
      const response = await authenticatedFetch(
        "/api/organizations/approval-notice",
        {
          method: "PATCH",
          cache: "no-store",
        },
      );
      if (!response.ok) {
        throw new Error("승인 알림을 닫지 못했습니다.");
      }
      setNotice(null);
    } catch {
      setDismissError(
        "알림을 닫지 못했습니다. 잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setDismissing(false);
    }
  };

  if (!notice) return null;

  return (
    <div
      role="alert"
      className="mb-6 rounded-2xl border border-emerald-700/20 bg-emerald-50 px-4 py-3 text-emerald-950 shadow-sm dark:border-emerald-400/20 dark:bg-emerald-950/35 dark:text-emerald-100"
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-sm font-bold text-white dark:bg-emerald-500 dark:text-emerald-950"
        >
          ✓
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-6">
            {notice.organizationName} 모임 가입이 승인되었습니다.
          </p>
          {dismissError && (
            <p className="mt-1 text-xs text-rose-700 dark:text-rose-300">
              {dismissError}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => void dismissNotice()}
          disabled={dismissing}
          aria-label="모임 승인 알림 닫기"
          className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-emerald-800 transition-colors hover:bg-emerald-700/10 disabled:cursor-wait disabled:opacity-50 dark:text-emerald-200 dark:hover:bg-emerald-300/10"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-5 w-5"
          >
            <path
              d="M6 6l12 12M18 6L6 18"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
