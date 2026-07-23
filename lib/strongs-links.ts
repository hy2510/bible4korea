export function getHebrewStrongsDictionaryUrl(strongs: string): string {
  const number = strongs.replace(/^H/i, "");
  return `https://dict.naver.com/hbokodict/#/search?query=${encodeURIComponent(number)}`;
}

export function getGreekStrongsDictionaryUrl(strongs: string): string {
  const number = strongs.replace(/^G/i, "");
  return `https://dict.naver.com/grckodict/#/search?query=${encodeURIComponent(number)}`;
}

/** 네이버 사전 SPA를 모바일 레이아웃으로 강제 (iframe 모달용) */
export function toMobileDictionaryUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set("m", "mobile");
    return parsed.toString();
  } catch {
    return url;
  }
}

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

export function strongsCodesMatch(a: string, b: string): boolean {
  const left = parseStrongsQuery(a);
  const right = parseStrongsQuery(b);
  return left !== null && left === right;
}
