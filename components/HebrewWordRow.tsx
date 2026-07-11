import type { HebrewWord } from "@/lib/hebrew-morphology";
import { getHebrewStrongsDictionaryUrl } from "@/lib/strongs-links";
import { OriginalWordRow } from "@/components/OriginalWordRow";

interface HebrewWordRowProps {
  words: HebrewWord[];
}

export function HebrewWordRow({ words }: HebrewWordRowProps) {
  return (
    <OriginalWordRow
      words={words}
      language="hebrew"
      getDictionaryUrl={getHebrewStrongsDictionaryUrl}
    />
  );
}
