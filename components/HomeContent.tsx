"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ActivityRanking } from "@/components/ActivityRanking";
import { BibleStudyGuide } from "@/components/BibleStudyGuide";
import { HebrewAlphabetGuide } from "@/components/HebrewAlphabetGuide";
import { HomeDailyGoalCard } from "@/components/HomeDailyGoalCard";
import { LastReadCard } from "@/components/LastReadCard";
import { VerseOfDay } from "@/components/VerseOfDay";

const SHOW_HOME_GUIDE_BUTTON = false;

export function HomeContent() {
  const searchParams = useSearchParams();
  const isBasics = searchParams.get("view") === "basics";

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
      <section className="mb-13 px-0 text-center sm:px-13 sm:text-left">
        <h1 className="font-serif text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
          <span className="sm:hidden">
            한민족을 위한
            <br />
            원어 성경
          </span>
          <span className="hidden sm:inline">한민족을 위한 원어 성경</span>
        </h1>
        <p className="mt-3 text-stone-600">
          우리말로 소리 내어 말씀을 마음에 새기고, 원어와 원전 분해를 통해 그
          깊은 뜻을 탐구해 보세요.
        </p>
        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-start">
          <Link
            href="/books"
            className="inline-flex cursor-pointer items-center rounded-xl bg-amber-800 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-amber-900"
          >
            성경 목차 보기
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

      <VerseOfDay />

      <HomeDailyGoalCard />

      <ActivityRanking />

      <LastReadCard />
    </div>
  );
}
