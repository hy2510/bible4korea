import { ImageResponse } from "next/og";

const LOGO_BG = "#92400e";
const LOGO_TEXT = "#fffbeb";
const HEBREW_FONT_URL =
  "https://fonts.gstatic.com/s/notosanshebrew/v50/or3HQ7v33eiDljA1IufXTtVf7V6RvEEdhQlk0LlGxCyaeNKYZC0sqk3xXGiXkI2tog.ttf";

let hebrewFontCache: ArrayBuffer | null = null;

async function getHebrewFont() {
  if (!hebrewFontCache) {
    const response = await fetch(HEBREW_FONT_URL);
    if (!response.ok) {
      throw new Error("Failed to load Hebrew font for site icon");
    }
    hebrewFontCache = await response.arrayBuffer();
  }

  return hebrewFontCache;
}

export async function createSiteIcon(size: number) {
  const font = await getHebrewFont();
  const borderRadius = Math.round(size * 0.25);
  const fontSize = Math.round(size * 0.4375);
  const letterSpacing = Math.round(size * 0.02);

  // Satori는 RTL 미지원 — row-reverse로 화면 오른쪽=א, 왼쪽=ת ("את")
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "row-reverse",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: LOGO_BG,
          borderRadius,
          color: LOGO_TEXT,
          fontSize,
          fontWeight: 700,
          fontFamily: "Noto Sans Hebrew",
          gap: letterSpacing,
        }}
      >
        <span>{"\u05D0"}</span>
        <span>{"\u05EA"}</span>
      </div>
    ),
    {
      width: size,
      height: size,
      fonts: [
        {
          name: "Noto Sans Hebrew",
          data: font,
          style: "normal",
          weight: 700,
        },
      ],
    },
  );
}
