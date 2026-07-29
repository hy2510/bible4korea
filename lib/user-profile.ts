export interface UserProfileSettings {
  affiliation: string | null;
  nickname: string | null;
  affiliationFilterOnly: boolean;
}

export const EMPTY_USER_PROFILE_SETTINGS: UserProfileSettings = {
  affiliation: null,
  nickname: null,
  affiliationFilterOnly: false,
};

export const NICKNAME_MAX_LENGTH = 20;

export function normalizeNickname(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function isValidNickname(value: string): boolean {
  const normalized = normalizeNickname(value);
  if (!normalized) return true;
  return (
    normalized.length >= 1 && normalized.length <= NICKNAME_MAX_LENGTH
  );
}

export function getUserDisplayName(
  nickname: string | null | undefined,
  username: string | null | undefined,
): string {
  const normalizedNickname = nickname ? normalizeNickname(nickname) : "";
  if (normalizedNickname) return normalizedNickname;
  return username?.trim() || "회원";
}

export function mapUserProfileRow(row: {
  affiliation: string | null;
  nickname: string | null;
  affiliation_filter_only: boolean;
}): UserProfileSettings {
  return {
    affiliation: row.affiliation,
    nickname: row.nickname,
    affiliationFilterOnly: row.affiliation_filter_only,
  };
}
