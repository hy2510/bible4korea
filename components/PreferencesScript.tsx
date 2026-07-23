import { READING_FONT_SIZE_STORAGE_KEY } from "@/lib/reading-font-size";
import {
  PWA_THEME_COLOR,
  THEME_COOKIE_NAME,
  THEME_STORAGE_KEY,
} from "@/lib/theme";

const preferencesScript = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");function setMeta(name,content){document.querySelectorAll('meta[name="'+name+'"]').forEach(function(el){el.remove();});var m=document.createElement("meta");m.setAttribute("name",name);m.setAttribute("content",content);document.head.appendChild(m);}if(t==="dark"){document.documentElement.classList.add("dark");document.documentElement.style.colorScheme="dark";setMeta("theme-color","${PWA_THEME_COLOR.dark}");setMeta("apple-mobile-web-app-status-bar-style","black-translucent");document.cookie="${THEME_COOKIE_NAME}=dark; path=/; max-age=31536000; SameSite=Lax";}else{setMeta("theme-color","${PWA_THEME_COLOR.light}");setMeta("apple-mobile-web-app-status-bar-style","default");document.cookie="${THEME_COOKIE_NAME}=light; path=/; max-age=31536000; SameSite=Lax";}var s=localStorage.getItem("${READING_FONT_SIZE_STORAGE_KEY}");if(s==="small"||s==="large"){document.documentElement.dataset.readingFontSize=s;}}catch(e){}})();`;

export function PreferencesScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: preferencesScript,
      }}
    />
  );
}
