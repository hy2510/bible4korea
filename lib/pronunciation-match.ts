import { stripKoreanBibleQuotes } from "@/lib/korean-verse-text";

export interface PronunciationEvaluation {
  score: number;
  feedback: string;
  tone: "great" | "good" | "retry";
}

export function normalizePronunciationText(text: string): string {
  return stripKoreanBibleQuotes(text)
    .normalize("NFKC")
    .toLocaleLowerCase("ko-KR")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

interface ExpectedPronunciationText {
  comparisonText: string;
  originalLength: number;
  ignoredCharacterCount: number;
  originalCharacterIndexes: number[];
}

function normalizeIgnoredWords(ignoredWords: readonly string[]): string[] {
  return [
    ...new Set(
      ignoredWords
        .map(normalizePronunciationText)
        .filter(Boolean),
    ),
  ].sort((left, right) => right.length - left.length);
}

function removeIgnoredWords(
  normalizedText: string,
  normalizedIgnoredWords: readonly string[],
): string {
  return normalizedIgnoredWords.reduce(
    (current, ignoredWord) => current.split(ignoredWord).join(""),
    normalizedText,
  );
}

function getExpectedPronunciationText(
  expectedText: string,
  ignoredWords: readonly string[],
): ExpectedPronunciationText {
  const normalizedText = normalizePronunciationText(expectedText);
  const normalizedIgnoredWords = normalizeIgnoredWords(ignoredWords);
  const ignoredCharacterIndexes = new Set<number>();

  for (const ignoredWord of normalizedIgnoredWords) {
    let searchIndex = 0;

    while (searchIndex < normalizedText.length) {
      const matchIndex = normalizedText.indexOf(ignoredWord, searchIndex);
      if (matchIndex === -1) break;

      for (
        let characterIndex = matchIndex;
        characterIndex < matchIndex + ignoredWord.length;
        characterIndex++
      ) {
        ignoredCharacterIndexes.add(characterIndex);
      }
      searchIndex = matchIndex + ignoredWord.length;
    }
  }

  const originalCharacterIndexes: number[] = [];
  let comparisonText = "";

  for (
    let characterIndex = 0;
    characterIndex < normalizedText.length;
    characterIndex++
  ) {
    if (ignoredCharacterIndexes.has(characterIndex)) continue;
    comparisonText += normalizedText[characterIndex];
    originalCharacterIndexes.push(characterIndex);
  }

  return {
    comparisonText,
    originalLength: normalizedText.length,
    ignoredCharacterCount: ignoredCharacterIndexes.size,
    originalCharacterIndexes,
  };
}

const MAX_NUMBER_CANDIDATES = 64;
const SINO_SMALL_UNITS = ["", "십", "백", "천"] as const;
const SINO_LARGE_UNITS = ["", "만", "억", "조", "경"] as const;
const SINO_DIGITS = ["", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"] as const;
const NATIVE_ONES = [
  "",
  "하나",
  "둘",
  "셋",
  "넷",
  "다섯",
  "여섯",
  "일곱",
  "여덟",
  "아홉",
] as const;
const NATIVE_COUNTER_ONES = ["", "한", "두", "세", "네"] as const;
const NATIVE_TENS = [
  "",
  "열",
  "스물",
  "서른",
  "마흔",
  "쉰",
  "예순",
  "일흔",
  "여든",
  "아흔",
] as const;

function toSinoKoreanUnderTenThousand(value: number): string {
  let result = "";

  for (let position = 3; position >= 0; position--) {
    const unitValue = 10 ** position;
    const digit = Math.floor(value / unitValue) % 10;
    if (digit === 0) continue;

    if (digit !== 1 || position === 0) {
      result += SINO_DIGITS[digit];
    }
    result += SINO_SMALL_UNITS[position];
  }

  return result;
}

function toSinoKoreanNumber(digits: string): string | null {
  let value = Number(digits);
  if (!Number.isSafeInteger(value) || value < 0) return null;
  if (value === 0) return "영";

  const groups: string[] = [];
  let groupIndex = 0;

  while (value > 0) {
    if (groupIndex >= SINO_LARGE_UNITS.length) return null;

    const groupValue = value % 10_000;
    if (groupValue > 0) {
      groups.unshift(
        `${toSinoKoreanUnderTenThousand(groupValue)}${SINO_LARGE_UNITS[groupIndex]}`,
      );
    }

    value = Math.floor(value / 10_000);
    groupIndex++;
  }

  return groups.join("");
}

function toNativeKoreanNumbers(value: number): string[] {
  if (!Number.isInteger(value) || value < 1 || value > 99) return [];

  const tens = Math.floor(value / 10);
  const ones = value % 10;
  const native = `${NATIVE_TENS[tens]}${NATIVE_ONES[ones]}`;
  const variants = [native];

  if (value === 20) {
    variants.push("스무");
  } else if (ones >= 1 && ones <= 4) {
    variants.push(`${NATIVE_TENS[tens]}${NATIVE_COUNTER_ONES[ones]}`);
  }

  if (value === 1) variants.push("첫");

  return variants;
}

function getKoreanNumberCandidates(rawNumber: string): string[] {
  const digits = rawNumber.replace(/,/g, "");
  if (!/^\d+$/.test(digits)) return [rawNumber];

  const candidates = new Set<string>([rawNumber]);
  const sinoKorean = toSinoKoreanNumber(digits);

  if (sinoKorean) {
    candidates.add(sinoKorean);

    const numericValue = Number(digits);
    if (
      Number.isSafeInteger(numericValue) &&
      numericValue >= 100 &&
      digits.replace(/^0+/, "").startsWith("1") &&
      !sinoKorean.startsWith("일")
    ) {
      candidates.add(`일${sinoKorean}`);
    }
  }

  const numericValue = Number(digits);
  if (Number.isSafeInteger(numericValue)) {
    for (const nativeKorean of toNativeKoreanNumbers(numericValue)) {
      candidates.add(nativeKorean);
    }
  }

  if (digits === "0") candidates.add("공");

  return [...candidates];
}

function getEditDistance(expected: string, actual: string): number {
  if (expected === actual) return 0;
  if (expected.length === 0) return actual.length;
  if (actual.length === 0) return expected.length;

  let previous = Array.from({ length: actual.length + 1 }, (_, index) => index);

  for (let expectedIndex = 1; expectedIndex <= expected.length; expectedIndex++) {
    const current = [expectedIndex];

    for (let actualIndex = 1; actualIndex <= actual.length; actualIndex++) {
      const substitutionCost =
        expected[expectedIndex - 1] === actual[actualIndex - 1] ? 0 : 1;

      current[actualIndex] = Math.min(
        current[actualIndex - 1] + 1,
        previous[actualIndex] + 1,
        previous[actualIndex - 1] + substitutionCost,
      );
    }

    previous = current;
  }

  return previous[actual.length];
}

function getRecognizedTextCandidates(
  expected: string,
  recognizedText: string,
  normalizedIgnoredWords: readonly string[],
): string[] {
  const source = recognizedText.normalize("NFKC");
  const numberMatches = [...source.matchAll(/\d[\d,]*/g)];
  const normalizeCandidate = (candidate: string) =>
    removeIgnoredWords(
      normalizePronunciationText(candidate),
      normalizedIgnoredWords,
    );

  if (numberMatches.length === 0) {
    return [normalizeCandidate(source)];
  }

  let candidates = [""];
  let cursor = 0;

  for (const match of numberMatches) {
    const matchIndex = match.index;
    const rawNumber = match[0];
    const prefix = source.slice(cursor, matchIndex);
    const nextCursor = matchIndex + rawNumber.length;
    const replacements = getKoreanNumberCandidates(rawNumber);
    const expanded = new Set<string>();

    for (const candidate of candidates) {
      for (const replacement of replacements) {
        expanded.add(`${candidate}${prefix}${replacement}`);
      }
    }

    candidates = [...expanded];

    if (candidates.length > MAX_NUMBER_CANDIDATES) {
      const remainingSource = source.slice(nextCursor);
      candidates = candidates
        .map((candidate) => ({
          candidate,
          distance: getEditDistance(
            expected,
            normalizeCandidate(`${candidate}${remainingSource}`),
          ),
        }))
        .sort((left, right) => left.distance - right.distance)
        .slice(0, MAX_NUMBER_CANDIDATES)
        .map(({ candidate }) => candidate);
    }

    cursor = nextCursor;
  }

  const suffix = source.slice(cursor);
  return [
    ...new Set(
      candidates.map((candidate) =>
        normalizeCandidate(`${candidate}${suffix}`),
      ),
    ),
  ];
}

interface PronunciationProgressMatch {
  characterCount: number;
  similarity: number;
  lengthDifference: number;
}

function getPronunciationProgressMatch(
  expected: string,
  recognized: string,
): PronunciationProgressMatch {
  let previous = Array.from(
    { length: recognized.length + 1 },
    (_, index) => index,
  );
  let bestCharacterCount = 0;
  let bestSimilarity = 0;
  let bestLengthDifference = Number.POSITIVE_INFINITY;

  for (
    let expectedIndex = 1;
    expectedIndex <= expected.length;
    expectedIndex++
  ) {
    const current = [expectedIndex];

    for (
      let recognizedIndex = 1;
      recognizedIndex <= recognized.length;
      recognizedIndex++
    ) {
      const substitutionCost =
        expected[expectedIndex - 1] === recognized[recognizedIndex - 1]
          ? 0
          : 1;

      current[recognizedIndex] = Math.min(
        current[recognizedIndex - 1] + 1,
        previous[recognizedIndex] + 1,
        previous[recognizedIndex - 1] + substitutionCost,
      );
    }

    const comparisonLength = Math.max(expectedIndex, recognized.length);
    const distance = current[recognized.length];
    const similarity = 1 - distance / comparisonLength;
    const lengthDifference = Math.abs(expectedIndex - recognized.length);

    if (
      similarity > bestSimilarity ||
      (similarity === bestSimilarity &&
        lengthDifference < bestLengthDifference)
    ) {
      bestCharacterCount = expectedIndex;
      bestSimilarity = similarity;
      bestLengthDifference = lengthDifference;
    }

    previous = current;
  }

  return {
    characterCount: bestCharacterCount,
    similarity: bestSimilarity,
    lengthDifference: bestLengthDifference,
  };
}

export function getPronunciationCharacterCount(
  expectedText: string,
  recognizedText: string,
  ignoredWords: readonly string[] = [],
): number {
  const expectedTextData = getExpectedPronunciationText(
    expectedText,
    ignoredWords,
  );
  const expected = expectedTextData.comparisonText;
  const normalizedIgnoredWords = normalizeIgnoredWords(ignoredWords);
  const recognizedCandidates = getRecognizedTextCandidates(
    expected,
    recognizedText,
    normalizedIgnoredWords,
  );

  if (!expected || recognizedCandidates.every((candidate) => !candidate)) {
    return 0;
  }

  const bestMatch = recognizedCandidates
    .filter(Boolean)
    .map((recognized) => getPronunciationProgressMatch(expected, recognized))
    .reduce((best, candidate) => {
      if (
        candidate.similarity > best.similarity ||
        (candidate.similarity === best.similarity &&
          candidate.lengthDifference < best.lengthDifference) ||
        (candidate.similarity === best.similarity &&
          candidate.lengthDifference === best.lengthDifference &&
          candidate.characterCount > best.characterCount)
      ) {
        return candidate;
      }

      return best;
    });

  if (bestMatch.similarity < 0.45 || bestMatch.characterCount < 1) return 0;
  if (bestMatch.characterCount >= expected.length) {
    return expectedTextData.originalLength;
  }

  return (
    (expectedTextData.originalCharacterIndexes[
      bestMatch.characterCount - 1
    ] ?? -1) + 1
  );
}

export function evaluatePronunciation(
  expectedText: string,
  recognizedText: string,
  ignoredWords: readonly string[] = [],
): PronunciationEvaluation {
  const expectedTextData = getExpectedPronunciationText(
    expectedText,
    ignoredWords,
  );
  const expected = expectedTextData.comparisonText;
  const normalizedIgnoredWords = normalizeIgnoredWords(ignoredWords);
  const score = getRecognizedTextCandidates(
    expected,
    recognizedText,
    normalizedIgnoredWords,
  ).reduce(
    (bestScore, recognized) => {
      const comparisonLength =
        expectedTextData.ignoredCharacterCount +
        Math.max(expected.length, recognized.length);
      const distance = getEditDistance(expected, recognized);
      const candidateScore =
        comparisonLength === 0
          ? 0
          : Math.max(
              0,
              Math.round((1 - distance / comparisonLength) * 100),
            );

      return Math.max(bestScore, candidateScore);
    },
    0,
  );

  if (score >= 70) {
    return {
      score,
      feedback: "잘 읽었어요. 다음 구절로 넘어가 보세요.",
      tone: "great",
    };
  }

  if (score >= 50) {
    return {
      score,
      feedback: "통과했어요. 다른 부분을 확인하거나 다음 구절로 넘어가세요.",
      tone: "good",
    };
  }

  return {
    score,
    feedback: "본문을 천천히 보며 다시 읽어 보세요.",
    tone: "retry",
  };
}
