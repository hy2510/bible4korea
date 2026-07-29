export const AFFILIATION_MAX_LENGTH = 50;

export function normalizeAffiliation(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function isValidAffiliation(value: string): boolean {
  const normalized = normalizeAffiliation(value);
  return (
    normalized.length >= 1 && normalized.length <= AFFILIATION_MAX_LENGTH
  );
}
