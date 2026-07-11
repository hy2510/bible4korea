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

function updateMeta(name: string, content: string): void {
  let meta = document.querySelector(`meta[name="${name}"]`);
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", name);
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", content);
}

export function setThemeCookie(mode: ThemeMode): void {
  document.cookie = `${THEME_COOKIE_NAME}=${mode}; path=/; max-age=31536000; SameSite=Lax`;
}

export function applyTheme(mode: ThemeMode): void {
  document.documentElement.classList.toggle("dark", mode === "dark");
  document.documentElement.style.colorScheme = mode;
  updateMeta("theme-color", PWA_THEME_COLOR[mode]);
  updateMeta(
    "apple-mobile-web-app-status-bar-style",
    mode === "dark" ? "black-translucent" : "default",
  );
  setThemeCookie(mode);
}

export function saveTheme(mode: ThemeMode): void {
  localStorage.setItem(THEME_STORAGE_KEY, mode);
  applyTheme(mode);
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}
