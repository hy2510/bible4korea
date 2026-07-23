let lockCount = 0;
let savedOverflow = "";

/**
 * Nested modals can each set body overflow. A simple save/restore
 * overwrites the previous lock and can leave scrolling stuck on "hidden".
 * Use a ref-count so only the outermost unlock restores overflow.
 */
export function lockBodyScroll(): () => void {
  if (typeof document === "undefined") {
    return () => {};
  }

  if (lockCount === 0) {
    savedOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  lockCount += 1;

  let released = false;
  return () => {
    if (released) return;
    released = true;
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount === 0) {
      document.body.style.overflow = savedOverflow;
      savedOverflow = "";
    }
  };
}

/** Safety valve after route changes if a modal unmount raced. */
export function resetBodyScrollLock(): void {
  if (typeof document === "undefined") return;
  lockCount = 0;
  savedOverflow = "";
  document.body.style.overflow = "";
}
