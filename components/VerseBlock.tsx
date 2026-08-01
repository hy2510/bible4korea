import type { GreekWord } from "@/lib/bible-types";
import type { HebrewWord } from "@/lib/bible-types";
import { GreekWordRow } from "@/components/GreekWordRow";
import { HebrewWordRow } from "@/components/HebrewWordRow";
import { KoreanVerseText } from "@/components/KoreanVerseText";

interface VerseBlockProps {
  verseNum: number;
  korean: string;
  hebrewWords?: HebrewWord[];
  greekWords?: GreekWord[];
}

export function VerseBlock({
  verseNum,
  korean,
  hebrewWords,
  greekWords,
}: VerseBlockProps) {
  return (
    <div
      id={`verse-${verseNum}`}
      className="rounded-xl border border-transparent px-3 py-3 transition-[background-color,border-color,box-shadow] duration-500 hover:border-stone-100 hover:bg-stone-50/60"
    >
      <p className="font-serif text-base leading-[1.9] text-stone-800 sm:text-lg">
        <sup className="mr-1.5 inline-block min-w-[1.25rem] text-xs font-semibold text-amber-800">
          {verseNum}
        </sup>
        <KoreanVerseText text={korean} />
      </p>

      {hebrewWords && hebrewWords.length > 0 && (
        <HebrewWordRow words={hebrewWords} />
      )}

      {greekWords && greekWords.length > 0 && (
        <GreekWordRow words={greekWords} />
      )}
    </div>
  );
}
