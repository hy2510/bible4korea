import type { GreekWord } from "@/lib/greek-morphology";
import { getGreekStrongsDictionaryUrl } from "@/lib/strongs-links";
import { OriginalWordRow } from "@/components/OriginalWordRow";

interface GreekWordRowProps {
  words: GreekWord[];
}

export function GreekWordRow({ words }: GreekWordRowProps) {
  return (
    <OriginalWordRow
      words={words}
      language="greek"
      getDictionaryUrl={getGreekStrongsDictionaryUrl}
    />
  );
}
