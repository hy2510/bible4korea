"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { BibleStudyGuide } from "@/components/BibleStudyGuide";
import { HebrewAlphabetGuide } from "@/components/HebrewAlphabetGuide";
import { HomeBibleReadingProgressCard } from "@/components/HomeBibleReadingProgressCard";
import { HomeDailyGoalCard } from "@/components/HomeDailyGoalCard";
import { LastReadCard } from "@/components/LastReadCard";
import { OrganizationApprovalAlert } from "@/components/OrganizationApprovalAlert";

const SHOW_HOME_GUIDE_BUTTON = false;

interface HomeContentProps {
  bibleVerseCounts: Record<string, number>;
}

export function HomeContent({ bibleVerseCounts }: HomeContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const signedIn = Boolean(user);
  const isBasics = searchParams.get("view") === "basics";

  useEffect(() => {
    if (!authLoading && !signedIn) {
      router.replace("/about");
    }
  }, [authLoading, router, signedIn]);

  if (authLoading || !signedIn) {
    return (
      <div
        className="mx-auto max-w-5xl px-4 py-12 text-center text-sm text-stone-400"
        aria-label="로그인 상태 확인 중"
      >
        불러오는 중…
      </div>
    );
  }

  if (isBasics) {
    return (
      <div className="mx-auto flex max-w-5xl flex-col gap-14 px-4 py-8 sm:px-6 sm:py-12">
        <BibleStudyGuide embedded />
        <HebrewAlphabetGuide />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <OrganizationApprovalAlert />

      <section className="mb-13 px-0 text-center sm:px-13 sm:text-left">
        <h1 className="font-serif text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
          <span className="sm:hidden">
            한민족
            <br />
            원어 성경
          </span>
          <span className="hidden sm:inline">한민족 원어 성경</span>
        </h1>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
          <Link
            href="/books"
            className="inline-flex cursor-pointer items-center rounded-xl bg-amber-800 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-amber-900"
          >
            성경 목차 보기
          </Link>
          <Link
            href="/about"
            className="inline-flex min-h-10 cursor-pointer items-center rounded-xl border border-amber-800/25 bg-white px-4 text-sm font-semibold text-amber-900 transition-colors hover:border-amber-800/40 hover:bg-amber-50 dark:border-amber-400/30 dark:bg-stone-900 dark:text-amber-300 dark:hover:bg-stone-800"
          >
            소개
          </Link>
          {SHOW_HOME_GUIDE_BUTTON && (
            <Link
              href="/?view=basics"
              className="inline-flex min-h-10 cursor-pointer items-center px-2 text-sm font-semibold text-amber-800 underline decoration-amber-800/30 underline-offset-4 transition-colors hover:text-amber-950 hover:decoration-amber-950 dark:text-amber-400 dark:hover:text-amber-300"
            >
              길잡이
            </Link>
          )}
        </div>
      </section>

      <div className="mb-13 divide-y divide-stone-200/80 overflow-hidden rounded-2xl border border-stone-200/80 bg-white empty:hidden dark:divide-stone-800 dark:border-stone-800 dark:bg-stone-900/60">
        <HomeDailyGoalCard />
        <HomeBibleReadingProgressCard
          bibleVerseCounts={bibleVerseCounts}
        />
      </div>

      <LastReadCard />
    </div>
  );
}
