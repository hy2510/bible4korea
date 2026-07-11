import Link from "next/link";
import type { BibleBook } from "@/lib/bible-api";

interface BookGridProps {
  books: BibleBook[];
  title: string;
}

export function BookGrid({ books, title }: BookGridProps) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-stone-500">{title}</h2>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
        {books.map((book) => (
          <Link
            key={book.id}
            href={`/read/${book.slug}/1`}
            className="group flex flex-col items-center rounded-xl border border-stone-200/80 bg-white px-2 py-3 transition-all hover:border-amber-300 hover:shadow-sm"
          >
            <span className="text-base font-semibold text-stone-800 group-hover:text-amber-900">
              {book.abbrev}
            </span>
            <span className="mt-0.5 truncate text-[11px] text-stone-500">
              {book.name}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
