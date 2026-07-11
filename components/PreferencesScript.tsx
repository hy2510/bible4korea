import { READING_FONT_SIZE_STORAGE_KEY } from "@/lib/reading-font-size";
import {
  PWA_THEME_COLOR,
  THEME_COOKIE_NAME,
  THEME_STORAGE_KEY,
} from "@/lib/theme";

const preferencesScript = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");var themeMeta=document.querySelector('meta[name="theme-color"]');var appleMeta=document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');if(t==="dark"){document.documentElement.classList.add("dark");document.documentElement.style.colorScheme="dark";if(themeMeta)themeMeta.setAttribute("content","${PWA_THEME_COLOR.dark}");if(appleMeta)appleMeta.setAttribute("content","black-translucent");document.cookie="${THEME_COOKIE_NAME}=dark; path=/; max-age=31536000; SameSite=Lax";}else{if(themeMeta)themeMeta.setAttribute("content","${PWA_THEME_COLOR.light}");if(appleMeta)appleMeta.setAttribute("content","default");document.cookie="${THEME_COOKIE_NAME}=light; path=/; max-age=31536000; SameSite=Lax";}var s=localStorage.getItem("${READING_FONT_SIZE_STORAGE_KEY}");if(s==="small"||s==="large"){document.documentElement.dataset.readingFontSize=s;}}catch(e){}})();`;

export function PreferencesScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: preferencesScript,
      }}
    />
  );
}
