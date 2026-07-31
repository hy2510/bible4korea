import type { HebrewWord } from "@/lib/hebrew-morphology";
import { OriginalWordRow } from "@/components/OriginalWordRow";

interface HebrewWordRowProps {
  words: HebrewWord[];
}

export function HebrewWordRow({ words }: HebrewWordRowProps) {
  return (
    <OriginalWordRow words={words} language="hebrew" />
  );
}
