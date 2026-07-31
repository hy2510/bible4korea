import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReadPageContent } from "@/components/ReadPageContent";
import { getBookSync, getBooksSync } from "@/lib/bible-books";
import { createPageMetadata } from "@/lib/seo";
import { parseStrongsQuery } from "@/lib/strongs-links";

interface PageProps {
  params: Promise<{ book: string; chapter: string }>;
  searchParams: Promise<{
    strongs?: string;
    from?: string;
    practice?: string;
  }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { book: bookSlug, chapter: chapterStr } = await params;
  const book = getBookSync(bookSlug);
  const chapter = Number(chapterStr);

  if (!book || !Number.isInteger(chapter) || chapter < 1) {
    return createPageMetadata({
      title: "성경 읽기",
      description:
        "한민족 원어 성경 — 히브리어 성경·헬라어 성경 원문과 개역한글판을 대조하고, 원전 분해로 읽어보세요.",
    });
  }

  return createPageMetadata({
    title: `${book.name} ${chapter}장`,
    description: `${book.name} ${chapter}장 ${book.testament === "old" ? "히브리어" : "헬라어"} 원문과 개역한글 성경을 나란히 읽고, Strong’s 원전 분해로 단어의 뜻과 형태를 살펴보세요.`,
    path: `/read/${book.slug}/${chapter}`,
  });
}

export default async function ReadPage({ params, searchParams }: PageProps) {
  const { book: bookSlug, chapter: chapterStr } = await params;
  const { strongs, from, practice } = await searchParams;
  const chapterNum = Number(chapterStr);
  const books = getBooksSync();
  const book = getBookSync(bookSlug);
  const highlightStrongs = parseStrongsQuery(strongs ?? "") ?? undefined;
  const jumpFromSearch = from === "search";
  const startAtTop = from === "book-list" || from === "book-shortcut";

  if (
    !book ||
    !Number.isInteger(chapterNum) ||
    chapterNum < 1 ||
    chapterNum > book.chapters
  ) {
    notFound();
  }

  return (
    <ReadPageContent
      books={books}
      book={book}
      chapterNum={chapterNum}
      highlightStrongs={highlightStrongs}
      jumpFromSearch={jumpFromSearch}
      startAtTop={startAtTop}
      openPronunciationPractice={practice === "1"}
    />
  );
}
