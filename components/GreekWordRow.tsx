import type { GreekWord } from "@/lib/bible-types";
import { OriginalWordRow } from "@/components/OriginalWordRow";

interface GreekWordRowProps {
  words: GreekWord[];
}

export function GreekWordRow({ words }: GreekWordRowProps) {
  return (
    <OriginalWordRow words={words} language="greek" />
  );
}
