function normalizeNickname(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function getUserDisplayName(
  nickname: string | null | undefined,
  username: string | null | undefined,
): string {
  const normalizedNickname = nickname ? normalizeNickname(nickname) : "";
  if (normalizedNickname) return normalizedNickname;
  return username?.trim() || "회원";
}
