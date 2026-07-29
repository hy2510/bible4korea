/** Sticky site header bar: h-14 + border-b (excludes safe-area padding). */
export function getHeaderOffset(): number {
  if (typeof document === "undefined") return 57;

  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--header-offset")
    .trim();
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : 57;
}

export function scrollElementBelowHeader(
  element: HTMLElement,
  behavior: ScrollBehavior = "smooth",
) {
  const top =
    element.getBoundingClientRect().top + window.scrollY - getHeaderOffset();
  window.scrollTo({ top: Math.max(0, top), behavior });
}

export function isElementAlignedBelowHeader(
  element: HTMLElement,
  tolerance = 1,
): boolean {
  return Math.abs(element.getBoundingClientRect().top - getHeaderOffset()) <= tolerance;
}
