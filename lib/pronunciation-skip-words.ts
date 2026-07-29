export const PRONUNCIATION_SKIP_WORD_MAX_LENGTH = 50;

export interface PronunciationSkipWord {
  id: number;
  phrase: string;
  createdAt: string;
}

export function normalizePronunciationSkipPhrase(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ");
}

export function isValidPronunciationSkipPhrase(value: string): boolean {
  const normalized = normalizePronunciationSkipPhrase(value);
  return (
    normalized.length >= 1 &&
    normalized.length <= PRONUNCIATION_SKIP_WORD_MAX_LENGTH &&
    /[\p{L}\p{N}]/u.test(normalized)
  );
}
