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

export function getPronunciationCharacterCount(
  expectedText: string,
  recognizedText: string,
): number {
  const expected = normalizePronunciationText(expectedText);
  const recognized = normalizePronunciationText(recognizedText);

  if (!expected || !recognized) return 0;

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

  return bestSimilarity >= 0.45 ? bestCharacterCount : 0;
}

export function evaluatePronunciation(
  expectedText: string,
  recognizedText: string,
): PronunciationEvaluation {
  const expected = normalizePronunciationText(expectedText);
  const recognized = normalizePronunciationText(recognizedText);
  const comparisonLength = Math.max(expected.length, recognized.length);
  const distance = getEditDistance(expected, recognized);
  const score =
    comparisonLength === 0
      ? 0
      : Math.max(0, Math.round((1 - distance / comparisonLength) * 100));

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
