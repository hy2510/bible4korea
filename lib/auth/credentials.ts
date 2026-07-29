export const USERNAME_MIN_LENGTH = 4;
export const USERNAME_MAX_LENGTH = 20;
export const PASSWORD_MIN_LENGTH = 4;
export const PASSWORD_MAX_LENGTH = 20;
export const RECOVERY_ANSWER_MIN_LENGTH = 2;
export const RECOVERY_ANSWER_MAX_LENGTH = 100;
const SUPABASE_PASSWORD_MIN_LENGTH = 6;
const SHORT_PASSWORD_NAMESPACE = "bible4korea-short-password:";

export const RECOVERY_QUESTIONS = [
  {
    id: "memorable_place",
    label: "가장 기억에 남는 장소는 어디인가요?",
  },
  {
    id: "parent_name",
    label: "아버지(어머니)의 성함은 무엇인가요?",
  },
  {
    id: "childhood_nickname",
    label: "나의 별명은 무엇이었나요?",
  },
] as const;

const LEGACY_RECOVERY_QUESTIONS = [
  {
    id: "first_bible_book",
    label: "처음으로 끝까지 읽은 성경은 무엇인가요?",
  },
  {
    id: "favorite_bible_person",
    label: "가장 좋아하는 성경 인물은 누구인가요?",
  },
] as const;

const KNOWN_RECOVERY_QUESTIONS = [
  ...RECOVERY_QUESTIONS,
  ...LEGACY_RECOVERY_QUESTIONS,
] as const;

export type RecoveryQuestionId =
  (typeof KNOWN_RECOVERY_QUESTIONS)[number]["id"];

const RECOVERY_QUESTION_IDS = new Set<string>(
  RECOVERY_QUESTIONS.map(({ id }) => id),
);
const KNOWN_RECOVERY_QUESTION_IDS = new Set<string>(
  KNOWN_RECOVERY_QUESTIONS.map(({ id }) => id),
);

export function normalizeUsername(value: string): string {
  return value.normalize("NFKC").trim().toLowerCase();
}

export function isValidUsername(value: string): boolean {
  const normalized = normalizeUsername(value);
  return /^[a-z0-9][a-z0-9._-]*[a-z0-9_-]$/.test(normalized) &&
    !normalized.includes("..") &&
    normalized.length >= USERNAME_MIN_LENGTH &&
    normalized.length <= USERNAME_MAX_LENGTH;
}

export function isValidPassword(value: string): boolean {
  return (
    value.length >= PASSWORD_MIN_LENGTH &&
    value.length <= PASSWORD_MAX_LENGTH
  );
}

export function toSupabasePassword(value: string): string {
  return value.length >= SUPABASE_PASSWORD_MIN_LENGTH
    ? value
    : `${SHORT_PASSWORD_NAMESPACE}${value}`;
}

export function isRecoveryQuestionId(
  value: string,
): value is RecoveryQuestionId {
  return RECOVERY_QUESTION_IDS.has(value);
}

export function isKnownRecoveryQuestionId(
  value: string,
): value is RecoveryQuestionId {
  return KNOWN_RECOVERY_QUESTION_IDS.has(value);
}

export function getRecoveryQuestionLabel(value: string): string | undefined {
  return KNOWN_RECOVERY_QUESTIONS.find(({ id }) => id === value)?.label;
}

export function normalizeRecoveryAnswer(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
}

export function isValidRecoveryAnswer(value: string): boolean {
  const normalized = normalizeRecoveryAnswer(value);
  return (
    normalized.length >= RECOVERY_ANSWER_MIN_LENGTH &&
    normalized.length <= RECOVERY_ANSWER_MAX_LENGTH
  );
}

export function toInternalAccountEmail(username: string): string {
  return `${normalizeUsername(username)}@users.bible4korea.app`;
}
