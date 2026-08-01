import type { Metadata } from "next";
import { BookGrid } from "@/components/BookGrid";
import { getBooks } from "@/lib/bible-api";
import { getBibleVerseCounts } from "@/lib/bible-search";
import {
  groupNewTestamentBySection,
  groupOldTestamentByTanakh,
} from "@/lib/book-order";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "성경 목차",
  description:
    "한민족 원어 성경 목차 — 히브리어 성경(구약)·헬라어 성경(신약) 원문과 한국어 성경을 대조하고, 원전 분해로 66권 전체를 탐색해 보세요.",
  path: "/books",
});

export default async function BooksPage() {
  const books = await getBooks();
  const bibleVerseCounts = getBibleVerseCounts();
  const tanakhSections = groupOldTestamentByTanakh(
    books.filter((b) => b.testament === "old"),
  );
  const newTestamentSections = groupNewTestamentBySection(
    books.filter((b) => b.testament === "new"),
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="mb-13 font-serif text-2xl font-bold text-stone-900">
        성경 목차
      </h1>
      <div className="space-y-10">
        <section className="space-y-8">
          {tanakhSections.map(({ section, books: sectionBooks }) => (
            <BookGrid
              key={section.id}
              books={sectionBooks}
              bibleVerseCounts={bibleVerseCounts}
              title={`${section.title} (${section.subtitle})`}
            />
          ))}
        </section>

        <section className="space-y-8">
          {newTestamentSections.map(({ section, books: sectionBooks }) => (
            <BookGrid
              key={section.id}
              books={sectionBooks}
              bibleVerseCounts={bibleVerseCounts}
              title={`${section.title} (${section.subtitle})`}
            />
          ))}
        </section>
      </div>
    </div>
  );
}
