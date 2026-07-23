export type ThemeMode = "light" | "dark";

export const THEME_STORAGE_KEY = "bible4korea:theme";
export const THEME_COOKIE_NAME = "bible4korea-theme";
export const THEME_CHANGE_EVENT = "bible4korea:theme-change";

/** 사이트 배경색 — globals.css `--background` 와 동일 */
export const BACKGROUND_COLOR: Record<ThemeMode, string> = {
  light: "#faf8f4",
  dark: "#14110f",
};

/** PWA 상태 표시줄·스플래시용 테마색 — 배경색과 동일 */
export const PWA_THEME_COLOR: Record<ThemeMode, string> = {
  light: BACKGROUND_COLOR.light,
  dark: BACKGROUND_COLOR.dark,
};

/** @deprecated PWA_THEME_COLOR 사용 */
export const THEME_COLOR = PWA_THEME_COLOR;

export function isThemeMode(value: string | null): value is ThemeMode {
  return value === "light" || value === "dark";
}

export function getStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return "light";

  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (isThemeMode(stored)) return stored;
  } catch {
    // ignore storage errors
  }

  return "light";
}

export function getThemeSnapshot(): ThemeMode {
  return getStoredTheme();
}

export function getServerThemeSnapshot(): ThemeMode {
  return "light";
}

export function subscribeTheme(onStoreChange: () => void): () => void {
  const handleStorage = (event: StorageEvent) => {
    if (event.key !== THEME_STORAGE_KEY) return;
    applyTheme(getStoredTheme());
    onStoreChange();
  };

  window.addEventListener(THEME_CHANGE_EVENT, onStoreChange);
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, onStoreChange);
    window.removeEventListener("storage", handleStorage);
  };
}

/**
 * theme-color / status-bar meta는 content만 바꾸면 일부 브라우저·PWA가
 * 무시하므로, 기존 태그를 제거하고 새로 넣습니다.
 */
function replaceMeta(name: string, content: string): void {
  document
    .querySelectorAll(`meta[name="${name}"]`)
    .forEach((el) => el.remove());
  const meta = document.createElement("meta");
  meta.setAttribute("name", name);
  meta.setAttribute("content", content);
  document.head.appendChild(meta);
}

/**
 * iOS(Safari 26+)는 theme-color 메타보다 viewport 상단의 fixed/sticky
 * 배경색을 샘플링합니다. CSS 변수만 바꾸면 재샘플링되지 않고,
 * 검색 모달처럼 fixed 전체 화면 레이어가 생겼다 사라져야 갱신됩니다.
 */
function refreshBrowserChrome(mode: ThemeMode): void {
  const color = PWA_THEME_COLOR[mode];
  document.documentElement.style.backgroundColor = color;
  document.body.style.backgroundColor = color;

  const previousOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";

  const overlay = document.createElement("div");
  overlay.setAttribute("aria-hidden", "true");
  overlay.style.cssText = [
    "position:fixed",
    "inset:0",
    "z-index:2147483647",
    `background-color:${color}`,
    "pointer-events:none",
  ].join(";");
  document.body.appendChild(overlay);

  // 한 프레임 이상 그려진 뒤 제거해야 상단 크롬이 재샘플링됩니다.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      overlay.remove();
      document.body.style.overflow = previousOverflow;
    });
  });
}

export function setThemeCookie(mode: ThemeMode): void {
  document.cookie = `${THEME_COOKIE_NAME}=${mode}; path=/; max-age=31536000; SameSite=Lax`;
}

export function applyTheme(mode: ThemeMode): void {
  document.documentElement.classList.toggle("dark", mode === "dark");
  document.documentElement.style.colorScheme = mode;
  replaceMeta("theme-color", PWA_THEME_COLOR[mode]);
  replaceMeta(
    "apple-mobile-web-app-status-bar-style",
    mode === "dark" ? "black-translucent" : "default",
  );
  setThemeCookie(mode);
}

export function saveTheme(mode: ThemeMode): void {
  const previous = getStoredTheme();
  localStorage.setItem(THEME_STORAGE_KEY, mode);
  applyTheme(mode);
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));

  if (mode !== previous) {
    refreshBrowserChrome(mode);
  }
}
