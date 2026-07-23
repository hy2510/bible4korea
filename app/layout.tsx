import { Noto_Serif_KR, Noto_Sans, Noto_Sans_Hebrew } from "next/font/google";
import { Geist } from "next/font/google";
import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Header } from "@/components/Header";
import { BibleSearchProvider } from "@/components/BibleSearch";
import { PwaInstallPrompt } from "@/components/PwaInstallPrompt";
import { ScrollToTopButton } from "@/components/ScrollToTopButton";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteJsonLd } from "@/components/SiteJsonLd";
import { PreferencesScript } from "@/components/PreferencesScript";
import { ReadingFontSizeProvider } from "@/components/ReadingFontSizeProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { rootMetadata, SITE_SHORT_NAME } from "@/lib/seo";
import { SAFE_AREA_VIEWPORT } from "@/lib/safe-area";
import {
  PWA_THEME_COLOR,
  THEME_COOKIE_NAME,
  isThemeMode,
  type ThemeMode,
} from "@/lib/theme";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const notoSerifKr = Noto_Serif_KR({
  variable: "--font-noto-serif-kr",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const notoSansHebrew = Noto_Sans_Hebrew({
  variable: "--font-noto-sans-hebrew",
  subsets: ["hebrew"],
  weight: ["400", "500"],
});

const notoSans = Noto_Sans({
  variable: "--font-noto-sans",
  subsets: ["greek", "latin"],
  weight: ["400", "500"],
});

async function getRequestTheme(): Promise<ThemeMode> {
  const cookieStore = await cookies();
  const stored = cookieStore.get(THEME_COOKIE_NAME)?.value ?? null;
  return isThemeMode(stored) ? stored : "light";
}

export async function generateMetadata(): Promise<Metadata> {
  const theme = await getRequestTheme();

  return {
    ...rootMetadata,
    appleWebApp: {
      capable: true,
      title: SITE_SHORT_NAME,
      statusBarStyle: theme === "dark" ? "black-translucent" : "default",
    },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const theme = await getRequestTheme();

  return {
    themeColor: PWA_THEME_COLOR[theme],
    colorScheme: theme,
    ...SAFE_AREA_VIEWPORT,
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      suppressHydrationWarning
      className={`${geist.variable} ${notoSerifKr.variable} ${notoSansHebrew.variable} ${notoSans.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
        <PreferencesScript />
        <ThemeProvider>
          <ReadingFontSizeProvider>
            <BibleSearchProvider>
              <SiteJsonLd />
              <Header />
              <main className="notranslate flex-1">{children}</main>
              <SiteFooter />
              <ScrollToTopButton />
              <PwaInstallPrompt />
              <ServiceWorkerRegister />
            </BibleSearchProvider>
          </ReadingFontSizeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
