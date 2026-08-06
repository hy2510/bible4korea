/** H 뒤에 숫자가 아닌 알파벳이 오는 비표준 코드 (예: HM, HA) */
export function isNonNumericHebrewStrongs(strongs: string): boolean {
  return /^H[a-zA-Z]/i.test(strongs);
}

export function isLinkableStrongs(strongs: string): boolean {
  if (!strongs || isNonNumericHebrewStrongs(strongs)) return false;
  return /^H\d+$/i.test(strongs) || /^G\d+$/i.test(strongs);
}

export function parseStrongsQuery(query: string): string | null {
  const match = query.trim().match(/^([HG])(\d+)$/i);
  if (!match || !isLinkableStrongs(`${match[1]}${match[2]}`)) return null;
  return `${match[1].toUpperCase()}${match[2]}`;
}

/** 숫자만 입력된 게마트리아 수치 (예: 390). Strong’s(H/G 접두)와 구분. */
export function parseGematriaQuery(query: string): number | null {
  const trimmed = query.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const value = Number.parseInt(trimmed, 10);
  if (!Number.isInteger(value) || value < 0) return null;
  return value;
}

export function strongsCodesMatch(a: string, b: string): boolean {
  const left = parseStrongsQuery(a);
  const right = parseStrongsQuery(b);
  return left !== null && left === right;
}
