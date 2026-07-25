import type { Metadata } from "next";

export const SITE_NAME = "한민족 원어 성경";
export const SITE_SHORT_NAME = "원어 성경";
export const SITE_TAGLINE = "히브리어 성경 · 헬라어 성경";
export const PRODUCTION_SITE_URL = "https://www.bible4korea.app";

export const SITE_DESCRIPTION =
  "한민족 원어 성경 — 히브리어 성경(구약 원문)과 헬라어 성경(신약 원문)을 개역한글 성경과 나란히 대조하고, Strong's 원전 분해로 단어·형태소를 깊이 탐구하는 온라인 원어 성경.";

export const SITE_KEYWORDS = [
  "히브리어 성경",
  "헬라어 성경",
  "한민족 원어 성경",
  "원어 성경",
  "구약 히브리어 성경",
  "신약 헬라어 성경",
  "히브리어 원문 성경",
  "헬라어 원문 성경",
  "그리스어 성경",
  "성경",
  "온라인 성경",
  "한국어 성경",
  "개역한글",
  "개역한글판",
  "성경 원문",
  "히브리어 원문",
  "헬라어 원문",
  "원전 분해",
  "형태소 분석",
  "Strong's",
  "스트롱 번호",
  "성경 대조",
  "성경 읽기",
  "바이블",
];

export function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_ENV === "production" && process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  if (process.env.NODE_ENV === "production") {
    return PRODUCTION_SITE_URL;
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
  const siteUrl = getSiteUrl();
  const url = `${siteUrl}${path}`;
  const isHome = path === "/";
  const homeTitle = `${SITE_NAME} | ${SITE_TAGLINE}`;

  return {
    title: isHome
      ? { absolute: homeTitle }
      : title
        ? pageTitle
        : undefined,
    description,
    keywords: SITE_KEYWORDS,
    applicationName: SITE_NAME,
    alternates: {
      canonical: path,
    },
    openGraph: {
      type: "website",
      locale: "ko_KR",
      url,
      siteName: SITE_NAME,
      title: isHome ? homeTitle : pageTitle,
      description,
      images: [
        {
          url: "/icon-512",
          width: 512,
          height: 512,
          alt: `${SITE_NAME} — ${SITE_TAGLINE}`,
        },
      ],
    },
    twitter: {
      card: "summary",
      title: isHome ? homeTitle : pageTitle,
      description,
      images: ["/icon-512"],
    },
  };
}

export const rootMetadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: `${SITE_NAME} | ${SITE_TAGLINE}`,
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
    title: `${SITE_NAME} | ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/icon-512",
        width: 512,
        height: 512,
        alt: `${SITE_NAME} — ${SITE_TAGLINE}`,
      },
    ],
  },
  twitter: {
    card: "summary",
    title: `${SITE_NAME} | ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    images: ["/icon-512"],
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
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    other: {
      "naver-site-verification": "108042b181d643d83321c81e1eddc0c4ddbc08b2",
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
  const siteUrl = getSiteUrl();

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        name: SITE_NAME,
        alternateName: [
          SITE_SHORT_NAME,
          "히브리어 성경",
          "헬라어 성경",
          "구약 히브리어 성경",
          "신약 헬라어 성경",
          "성경",
          "온라인 성경",
          "한민족을 위한 원어 성경",
          "원전 분해",
        ],
        url: `${siteUrl}/`,
        description: SITE_DESCRIPTION,
        inLanguage: "ko",
        about: [
          {
            "@type": "Thing",
            name: "히브리어 성경",
            description: "구약 히브리어 원문 성경",
          },
          {
            "@type": "Thing",
            name: "헬라어 성경",
            description: "신약 헬라어 원문 성경",
          },
        ],
        keywords:
          "히브리어 성경, 헬라어 성경, 원어 성경, 개역한글, Strong's, 원전 분해",
        publisher: { "@id": `${siteUrl}/#organization` },
      },
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: SITE_NAME,
        alternateName: [
          SITE_SHORT_NAME,
          "히브리어 성경",
          "헬라어 성경",
          "성경",
        ],
        url: `${siteUrl}/`,
        logo: {
          "@type": "ImageObject",
          url: `${siteUrl}/icon-512`,
          width: 512,
          height: 512,
        },
      },
    ],
  };
}
