export const AFFILIATION_MAX_LENGTH = 50;
export const HOME_RANKING_AFFILIATION_HINT_DISMISSED_KEY =
  "home-ranking-affiliation-hint-dismissed";

export function normalizeAffiliation(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function isValidAffiliation(value: string): boolean {
  const normalized = normalizeAffiliation(value);
  return (
    normalized.length >= 1 && normalized.length <= AFFILIATION_MAX_LENGTH
  );
}

export function isHomeRankingAffiliationHintDismissed(): boolean {
  if (typeof window === "undefined") return false;

  try {
    return (
      localStorage.getItem(HOME_RANKING_AFFILIATION_HINT_DISMISSED_KEY) === "1"
    );
  } catch {
    return false;
  }
}

export function dismissHomeRankingAffiliationHint(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(HOME_RANKING_AFFILIATION_HINT_DISMISSED_KEY, "1");
  } catch {
    // Ignore storage failures.
  }
}
