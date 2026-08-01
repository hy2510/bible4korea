import type { Metadata } from "next";

export const SITE_NAME = "한민족 원어 성경";
export const SITE_SHORT_NAME = "원어 성경";
export const SITE_TAGLINE = "히브리어 성경 · 헬라어 성경";
export const PRODUCTION_SITE_URL = "https://bible4korea.app";

export const SITE_DESCRIPTION =
  "히브리어·헬라어 원문과 한국어 성경을 나란히 읽고, Strong’s 원전 분해와 소리 내어 읽기, 일일 목표와 기록을 이용할 수 있는 온라인 원어 성경.";

export const SITE_KEYWORDS = [
  "한민족 원어 성경",
  "원어 성경",
  "히브리어 성경",
  "헬라어 성경",
  "그리스어 성경",
  "온라인 성경",
  "새번역",
  "개역한글",
  "원전 분해",
  "형태소 분석",
  "Strong's",
  "성경 대조",
  "성경 읽기",
  "소리 내어 성경 읽기",
];

export function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }

  // 검색 엔진에 노출되는 canonical·sitemap 주소가 Vercel 배포별 URL로
  // 달라지지 않도록 운영 환경에서는 대표 도메인을 고정한다.
  if (
    process.env.VERCEL_ENV === "production" ||
    process.env.NODE_ENV === "production"
  ) {
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
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "education",
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
        alternateName: SITE_SHORT_NAME,
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
          "히브리어 성경, 헬라어 성경, 원어 성경, 새번역, 개역한글, Strong's, 원전 분해",
        publisher: { "@id": `${siteUrl}/#organization` },
      },
      {
        "@type": "WebApplication",
        "@id": `${siteUrl}/#webapp`,
        name: SITE_NAME,
        url: `${siteUrl}/`,
        description: SITE_DESCRIPTION,
        applicationCategory: "EducationalApplication",
        operatingSystem: "Any",
        browserRequirements: "JavaScript를 지원하는 최신 웹 브라우저",
        inLanguage: "ko",
        isAccessibleForFree: true,
        featureList: [
          "히브리어·헬라어 원문과 한국어 성경 대조",
          "Strong’s 원전 분해와 단어 탐구",
          "소리 내어 읽기와 발음 확인",
          "일일 읽기 목표와 개인 읽기 기록",
          "모임 활동",
          "친구 간 말씀 읽기 활동 공유",
        ],
        publisher: { "@id": `${siteUrl}/#organization` },
      },
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: SITE_NAME,
        alternateName: SITE_SHORT_NAME,
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
