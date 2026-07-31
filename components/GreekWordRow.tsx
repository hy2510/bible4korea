import type { GreekWord } from "@/lib/greek-morphology";
import { OriginalWordRow } from "@/components/OriginalWordRow";

interface GreekWordRowProps {
  words: GreekWord[];
}

export function GreekWordRow({ words }: GreekWordRowProps) {
  return (
    <OriginalWordRow words={words} language="greek" />
  );
}
