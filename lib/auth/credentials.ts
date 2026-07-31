export const USERNAME_MIN_LENGTH = 4;
export const USERNAME_MAX_LENGTH = 20;
export const PASSWORD_MIN_LENGTH = 4;
export const PASSWORD_MAX_LENGTH = 20;
export const RECOVERY_CODE_LENGTH = 6;
const SUPABASE_PASSWORD_MIN_LENGTH = 6;
const SHORT_PASSWORD_NAMESPACE = "bible4korea-short-password:";
const INTERNAL_AUTH_DOMAIN = "id.bible4korea.invalid";

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

export function normalizeRecoveryCode(value: string): string {
  return value.normalize("NFKC").trim();
}

export function isValidRecoveryCode(value: string): boolean {
  return new RegExp(`^[0-9]{${RECOVERY_CODE_LENGTH}}$`).test(
    normalizeRecoveryCode(value),
  );
}

export function toSupabaseLoginIdentifier(username: string): string {
  return `${normalizeUsername(username)}@${INTERNAL_AUTH_DOMAIN}`;
}
