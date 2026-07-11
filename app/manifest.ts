import type { MetadataRoute } from "next";
import { cookies } from "next/headers";
import { SITE_DESCRIPTION, SITE_NAME, SITE_SHORT_NAME } from "@/lib/seo";
import {
  BACKGROUND_COLOR,
  PWA_THEME_COLOR,
  THEME_COOKIE_NAME,
  isThemeMode,
  type ThemeMode,
} from "@/lib/theme";

export const dynamic = "force-dynamic";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const cookieStore = await cookies();
  const stored = cookieStore.get(THEME_COOKIE_NAME)?.value ?? null;
  const theme: ThemeMode = isThemeMode(stored) ? stored : "light";

  return {
    name: SITE_NAME,
    short_name: SITE_SHORT_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: BACKGROUND_COLOR[theme],
    theme_color: PWA_THEME_COLOR[theme],
    lang: "ko",
    icons: [
      {
        src: "/icon",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/icon-192",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
