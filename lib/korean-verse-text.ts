/** 개역한글 대화 따옴표(`, ', 곡따옴표, 낫표 등)를 표시용으로 제거합니다. */
export function stripKoreanBibleQuotes(text: string): string {
  return text.replace(/[`'‘’“”「」『』]/g, "");
}
