"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BibleStudyGuide } from "@/components/BibleStudyGuide";
import { HebrewAlphabetGuide } from "@/components/HebrewAlphabetGuide";
import { LastReadCard } from "@/components/LastReadCard";
import { VerseOfDay } from "@/components/VerseOfDay";

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
          히브리어 성경(구약)과 헬라어 성경(신약) 원문을 개역한글 성경과 한눈에
          대조하며, Strong&apos;s 원전 분해로 말씀을 깊이 탐구해 보세요.
        </p>
        <Link
          href="/books"
          className="mt-6 inline-flex items-center rounded-xl bg-amber-800 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-amber-900"
        >
          성경 목차 보기
        </Link>
      </section>

      <VerseOfDay />

      <LastReadCard />
    </div>
  );
}
