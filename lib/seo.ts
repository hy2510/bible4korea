import type { Metadata } from "next";

export const SITE_NAME = "한민족 원어 성경";
export const SITE_SHORT_NAME = "원어 성경";
export const SITE_DESCRIPTION =
  "한민족 원어 성경 — 히브리어 성경·헬라어 원문과 개역한글판을 대조하고, 원전 분해로 단어·형태소를 깊이 탐구해 보세요.";

export const SITE_KEYWORDS = [
  "한민족 원어 성경",
  "원어 성경",
  "히브리어 성경",
  "원전 분해",
  "헬라어 성경",
  "개역한글판",
  "성경 원문",
  "히브리어 원문",
  "헬라어 원문",
  "형태소 분석",
  "Strong's",
  "성경 대조",
  "성경 읽기",
];

export function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

export function createPageMetadata({
  title,
  description = SITE_DESCRIPTION,
  path = "/",
}: {
  title?: string;
  description?: string;
  path?: string;
} = {}): Metadata {
  const pageTitle = title ?? SITE_NAME;
  const url = `${getSiteUrl()}${path}`;

  return {
    title: title ? pageTitle : undefined,
    description,
    keywords: SITE_KEYWORDS,
    alternates: {
      canonical: path,
    },
    openGraph: {
      type: "website",
      locale: "ko_KR",
      url,
      siteName: SITE_NAME,
      title: pageTitle,
      description,
    },
    twitter: {
      card: "summary",
      title: pageTitle,
      description,
    },
  };
}

export const rootMetadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "/",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  appleWebApp: {
    capable: true,
    title: SITE_SHORT_NAME,
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icon", sizes: "32x32", type: "image/png" },
      { url: "/icon-192", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon", sizes: "180x180", type: "image/png" }],
  },
};

export function getSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    alternateName: [
      SITE_SHORT_NAME,
      "한민족을 위한 원어 성경",
      "히브리어 성경",
      "원전 분해",
    ],
    url: getSiteUrl(),
    description: SITE_DESCRIPTION,
    inLanguage: "ko",
  };
}
