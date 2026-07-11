"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { BibleBook } from "@/lib/bible-api";
import {
  groupNewTestamentBySection,
  groupOldTestamentByTanakh,
} from "@/lib/book-order";

interface BookSelectorProps {
  books: BibleBook[];
  currentBookSlug: string;
}

export function BookSelector({ books, currentBookSlug }: BookSelectorProps) {
  const [open, setOpen] = useState(false);
  const currentBook = books.find((b) => b.slug === currentBookSlug);

  const tanakhSections = useMemo(
    () =>
      groupOldTestamentByTanakh(
        books.filter((book) => book.testament === "old"),
      ),
    [books],
  );
  const newTestamentSections = useMemo(
    () =>
      groupNewTestamentBySection(
        books.filter((book) => book.testament === "new"),
      ),
    [books],
  );

  return (
    <div className="relative w-fit">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex w-fit items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-800 transition-colors hover:border-amber-300"
      >
        <span>{currentBook?.name ?? "성경 선택"}</span>
        <svg
          className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-20"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute left-0 top-full z-30 mt-2 max-h-[70vh] w-72 overflow-y-auto rounded-2xl border border-stone-200 bg-white p-4 shadow-xl">
            <div className="mb-4">
              {/* <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-400">
                구약 (타나크)
              </p> */}
              {tanakhSections.map(({ section, books: sectionBooks }) => (
                <div key={section.id} className="mb-3 last:mb-0">
                  <p className="mb-1.5 text-[11px] font-medium text-stone-500">
                    {section.title}
                  </p>
                  <BookSection
                    books={sectionBooks}
                    currentBookSlug={currentBookSlug}
                    onSelect={() => setOpen(false)}
                  />
                </div>
              ))}
            </div>
            <div className="mb-4">
              {/* <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-400">
                신약
              </p> */}
              {newTestamentSections.map(({ section, books: sectionBooks }) => (
                <div key={section.id} className="mb-3 last:mb-0">
                  <p className="mb-1.5 text-[11px] font-medium text-stone-500">
                    {section.title}
                  </p>
                  <BookSection
                    books={sectionBooks}
                    currentBookSlug={currentBookSlug}
                    onSelect={() => setOpen(false)}
                  />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function BookSection({
  title,
  books,
  currentBookSlug,
  onSelect,
}: {
  title?: string;
  books: BibleBook[];
  currentBookSlug: string;
  onSelect: () => void;
}) {
  return (
    <div className="mb-4 last:mb-0 border-b border-stone-200 pb-4">
      {title && (
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-400">
          {title}
        </p>
      )}
      <div className="grid grid-cols-3 gap-1">
        {books.map((book) => (
          <Link
            key={book.id}
            href={`/read/${book.slug}/1`}
            onClick={onSelect}
            className={`rounded-lg px-2 py-1.5 text-center text-xs transition-colors ${
              book.slug === currentBookSlug
                ? "bg-amber-800 text-white"
                : "text-stone-600 bg-stone-50 hover:bg-amber-50 hover:text-amber-900"
            }`}
          >
            {book.abbrev}
          </Link>
        ))}
      </div>
    </div>
  );
}
