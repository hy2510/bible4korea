"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ActivityRanking } from "@/components/ActivityRanking";
import {
  AffiliationSettings,
  type OrganizationSetupModalMode,
} from "@/components/AffiliationSettings";
import { useAuth } from "@/components/AuthProvider";
import { NotificationCountBadge } from "@/components/NotificationCountBadge";
import { useOrganizationPendingRequests } from "@/components/OrganizationPendingRequestsProvider";

type OrganizationPageTab = "organization" | "ranking";

export function RankingPageContent() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { pendingCount, refreshPendingCount } =
    useOrganizationPendingRequests();
  const [activeTab, setActiveTab] =
    useState<OrganizationPageTab>("ranking");
  const [requestedSetupModalMode, setRequestedSetupModalMode] =
    useState<OrganizationSetupModalMode | null>(null);

  const openOrganizationSetup = (
    mode: OrganizationSetupModalMode,
  ) => {
    setRequestedSetupModalMode(mode);
    setActiveTab("organization");
  };

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/about");
    }
  }, [loading, router, user]);

  if (loading || !user) {
    return (
      <div
        className="mx-auto max-w-3xl px-4 py-12 text-center text-sm text-stone-400"
        aria-label="로그인 상태 확인 중"
      >
        불러오는 중…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-7">
        <h1 className="font-serif text-2xl font-bold text-foreground">
          내 모임
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          같은 모임의 활동을 확인하고 모임 정보를 관리합니다.
        </p>
      </div>

      <div
        role="tablist"
        aria-label="내 모임 메뉴"
        className="mb-6 grid grid-cols-2 rounded-xl bg-surface-muted p-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "ranking"}
          onClick={() => {
            setRequestedSetupModalMode(null);
            setActiveTab("ranking");
          }}
          className={`flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors ${
            activeTab === "ranking"
              ? "bg-surface text-foreground shadow-sm"
              : "text-muted hover:text-foreground"
          }`}
        >
          모임 활동
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "organization"}
          onClick={() => {
            setRequestedSetupModalMode(null);
            setActiveTab("organization");
            void refreshPendingCount();
          }}
          className={`flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors ${
            activeTab === "organization"
              ? "bg-surface text-foreground shadow-sm"
              : "text-muted hover:text-foreground"
          }`}
        >
          <span>모임 관리</span>
          <NotificationCountBadge count={pendingCount} />
        </button>
      </div>

      {activeTab === "ranking" ? (
        <div role="tabpanel">
          <ActivityRanking
            onSearchOrganization={() =>
              openOrganizationSetup("search")
            }
            onCreateOrganization={() =>
              openOrganizationSetup("create")
            }
          />
        </div>
      ) : (
        <div role="tabpanel">
          <AffiliationSettings
            initialSetupModalMode={requestedSetupModalMode}
          />
        </div>
      )}
    </div>
  );
}
