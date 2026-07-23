/** 히브리어 자음 → 게마트리아 수치 (종서 형태 포함) */
export const HEBREW_LETTER_VALUES = {
  א: 1,
  ב: 2,
  ג: 3,
  ד: 4,
  ה: 5,
  ו: 6,
  ז: 7,
  ח: 8,
  ט: 9,
  י: 10,
  כ: 20,
  ך: 20,
  ל: 30,
  מ: 40,
  ם: 40,
  נ: 50,
  ן: 50,
  ס: 60,
  ע: 70,
  פ: 80,
  ף: 80,
  צ: 90,
  ץ: 90,
  ק: 100,
  ר: 200,
  ש: 300,
  ת: 400,
};

const FINAL_TO_REGULAR = {
  ך: "כ",
  ם: "מ",
  ן: "נ",
  ף: "פ",
  ץ: "צ",
};

/** 히브리어 결합 기호(니쿠드·악센트 등) */
const HEBREW_MARKS_RE = /[\u0591-\u05C7]/g;

export function computeHebrewGematria(text) {
  if (!text) return 0;

  let sum = 0;
  for (const char of text.replace(HEBREW_MARKS_RE, "").replace(/\//g, "")) {
    const value = HEBREW_LETTER_VALUES[char];
    if (value) sum += value;
  }
  return sum;
}

/** 니쿠드·종서를 정규화한 자음 연쇄 (동일 어근 계열 식별용) */
export function extractHebrewRootKey(text) {
  if (!text) return "";

  const consonants = [];
  for (const char of text.replace(HEBREW_MARKS_RE, "").replace(/\//g, "")) {
    if (!/[\u05D0-\u05EA]/.test(char)) continue;
    consonants.push(FINAL_TO_REGULAR[char] ?? char);
  }
  return consonants.join("");
}

/** 표시용 어근 (예: אמר → א-מ-ר) */
export function formatHebrewRootText(rootKey) {
  if (!rootKey) return "";
  return Array.from(rootKey).join("-");
}
