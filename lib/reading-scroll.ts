const MOBILE_READING_VIEWPORT_QUERY = "(max-width: 639px)";

/** Full sticky site header height, including the mobile safe area. */
export function getHeaderOffset(): number {
  if (typeof document === "undefined") return 57;

  const siteHeader = document.querySelector<HTMLElement>(
    "[data-site-header]",
  );
  const measuredHeight = siteHeader?.getBoundingClientRect().height;
  if (measuredHeight && measuredHeight > 0) return measuredHeight;

  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--header-offset")
    .trim();
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : 57;
}

function getPageScrollOffset(): number {
  const headerOffset = getHeaderOffset();
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function" ||
    !window.matchMedia(MOBILE_READING_VIEWPORT_QUERY).matches
  ) {
    return headerOffset;
  }

  const rawGap = getComputedStyle(document.documentElement)
    .getPropertyValue("--mobile-scroll-gap")
    .trim();
  const parsedGap = Number.parseFloat(rawGap);
  return headerOffset + (Number.isFinite(parsedGap) ? parsedGap : 12);
}

export function getChapterReadingScrollTarget(): HTMLElement | null {
  if (typeof document === "undefined") return null;

  const chapterStart = document.querySelector<HTMLElement>(
    "[data-chapter-reading-scroll-point]",
  );
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function" ||
    !window.matchMedia(MOBILE_READING_VIEWPORT_QUERY).matches
  ) {
    return chapterStart;
  }

  return (
    document.querySelector<HTMLElement>(
      "[data-mobile-verse-navigation-scroll-point]",
    ) ?? chapterStart
  );
}

export function scrollElementBelowHeader(
  element: HTMLElement,
  behavior: ScrollBehavior = "smooth",
) {
  const top =
    element.getBoundingClientRect().top +
    window.scrollY -
    getPageScrollOffset();
  window.scrollTo({ top: Math.max(0, top), behavior });
}

export function isElementAlignedBelowHeader(
  element: HTMLElement,
  tolerance = 1,
): boolean {
  return Math.abs(element.getBoundingClientRect().top - getHeaderOffset()) <= tolerance;
}
