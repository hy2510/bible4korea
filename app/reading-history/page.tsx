import type { Metadata } from "next";
import { ReadingHistoryManager } from "@/components/ReadingHistoryManager";
import { getBooks } from "@/lib/bible-api";
import { getBibleVerseCounts } from "@/lib/bible-search";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...createPageMetadata({
    title: "기록 관리",
    description:
      "최근 본 말씀과 최근 읽은 말씀 기록을 구분하여 성경 권별로 관리합니다.",
    path: "/reading-history",
  }),
  robots: {
    index: false,
    follow: false,
  },
};

export default async function ReadingHistoryPage() {
  const books = await getBooks();
  const bibleVerseCounts = getBibleVerseCounts();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="font-serif text-2xl font-bold text-foreground">
        기록 관리
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        최근 본 말씀과 최근 읽은 말씀을 구분하여 필요한 기록만 삭제할 수
        있습니다.
      </p>
      <ReadingHistoryManager
        books={books}
        bibleVerseCounts={bibleVerseCounts}
      />
    </div>
  );
}
