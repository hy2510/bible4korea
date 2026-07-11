export interface LicenseEntry {
  name: string;
  description: string;
  license: string;
  url?: string;
  note?: string;
}

/** npm 등 애플리케이션 빌드·실행에 포함되는 오픈소스 소프트웨어 */
export const SOFTWARE_LICENSES: LicenseEntry[] = [
  {
    name: "Next.js",
    description: "React 기반 웹 애플리케이션 프레임워크",
    license: "MIT License",
    url: "https://github.com/vercel/next.js",
  },
  {
    name: "React / React DOM",
    description: "사용자 인터페이스 라이브러리",
    license: "MIT License",
    url: "https://github.com/facebook/react",
  },
  {
    name: "Tailwind CSS",
    description: "유틸리티 우선 CSS 프레임워크",
    license: "MIT License",
    url: "https://github.com/tailwindlabs/tailwindcss",
  },
  {
    name: "better-sqlite3",
    description: "로컬 SQLite 데이터베이스 드라이버",
    license: "MIT License",
    url: "https://github.com/WiseLibs/better-sqlite3",
  },
  {
    name: "morphhb",
    description: "구약 히브리어 형태소 분석 데이터 패키지",
    license: "Open Scriptures Hebrew Bible (CC BY 4.0)",
    url: "https://github.com/openscriptures/morphhb",
  },
  {
    name: "TypeScript",
    description: "JavaScript 정적 타입 시스템",
    license: "Apache License 2.0",
    url: "https://github.com/microsoft/TypeScript",
  },
  {
    name: "ESLint",
    description: "JavaScript·TypeScript 린터",
    license: "MIT License",
    url: "https://github.com/eslint/eslint",
  },
  {
    name: "Noto Serif KR / Noto Sans / Noto Sans Hebrew",
    description: "Google Fonts 웹 글꼴 (next/font)",
    license: "SIL Open Font License 1.1",
    url: "https://fonts.google.com/noto",
  },
  {
    name: "Geist",
    description: "UI 산세리프 글꼴 (next/font)",
    license: "SIL Open Font License 1.1",
    url: "https://github.com/vercel/geist-font",
  },
];

/** 성경 본문·주석·사전 등 외부 데이터 및 API */
export const DATA_SOURCE_LICENSES: LicenseEntry[] = [
  {
    name: "Midvash API",
    description: "개역한글판 성경 본문 및 권·장 메타데이터",
    license: "Midvash 서비스 이용 약관",
    url: "https://midvash.com",
    note: "한글 성경 텍스트는 Midvash API를 통해 제공됩니다.",
  },
  {
    name: "개역한글판",
    description: "한국어 성경 번역본",
    license: "대한성서공회 저작권",
    url: "https://www.bsk.or.kr",
    note: "본문 표시에 사용되는 개역한글판의 저작권은 대한성서공회에 있습니다.",
  },
  {
    name: "OSHB (Open Scriptures Hebrew Bible)",
    description: "구약 히브리어 원문 및 형태소 정보",
    license: "Creative Commons Attribution 4.0 (CC BY 4.0)",
    url: "https://github.com/openscriptures/morphhb",
  },
  {
    name: "MorphGNT / SBLGNT",
    description: "신약 헬라어 원문 및 형태소 분석",
    license: "Creative Commons Attribution-ShareAlike 3.0 (MorphGNT) · SBLGNT 라이선스",
    url: "https://github.com/morphgnt/sblgnt",
    note: "SBLGNT 텍스트는 SBL(Society of Biblical Literature) 라이선스 조건을 따릅니다.",
  },
  {
    name: "Strong's Hebrew (Lexicon Omnium Gentium)",
    description: "히브리어 Strong's 번호 한국어 gloss",
    license: "Zenodo 레코드 및 제공자 라이선스",
    url: "https://zenodo.org/records/19099634",
  },
  {
    name: "Sefaria",
    description: "구약 랍비 주석(영문) API",
    license: "Creative Commons Attribution 3.0 (CC BY 3.0)",
    url: "https://www.sefaria.org",
    note: "주석 텍스트의 저작권은 각 주석 원저작자 및 Sefaria 정책에 따릅니다.",
  },
];

export const LICENSE_PAGE_INTRO =
  "한민족 원어 성경은 아래 오픈소스 소프트웨어와 외부 데이터·API를 활용합니다. 각 항목의 라이선스 조건을 준수하며, 자세한 내용은 링크된 원본을 참고해 주세요.";

export const LICENSE_PAGE_DISCLAIMER =
  "본 페이지는 이용 중인 구성 요소를 안내하기 위한 것이며, 법적 효력을 대체하지 않습니다. 라이선스 조건은 원 제공처의 최신 고지를 기준으로 합니다.";
