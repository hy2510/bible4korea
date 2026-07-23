const HIGHLIGHT_DURATION_MS = 2000;
const MAX_ATTEMPTS = 60;
const VERSE_JUMP_HIGHLIGHT_CLASS = "verse-jump-highlight";

export interface VerseJumpOptions {
  behavior?: ScrollBehavior;
}

function clearVerseHighlight(target: HTMLElement) {
  target.classList.remove(VERSE_JUMP_HIGHLIGHT_CLASS);
}

export function clearAllVerseHighlights() {
  document.querySelectorAll<HTMLElement>('[id^="verse-"]').forEach((target) => {
    clearVerseHighlight(target);
  });
}

export function highlightAndScrollToVerse(
  verse: number,
  options: VerseJumpOptions = {},
): (() => void) | null {
  const target = document.getElementById(`verse-${verse}`);
  if (!target) return null;

  const behavior = options.behavior ?? "smooth";

  clearAllVerseHighlights();
  target.scrollIntoView({ block: "start", behavior });
  target.classList.add(VERSE_JUMP_HIGHLIGHT_CLASS);

  const timeoutId = window.setTimeout(() => {
    clearVerseHighlight(target);
  }, HIGHLIGHT_DURATION_MS);

  return () => {
    window.clearTimeout(timeoutId);
    clearVerseHighlight(target);
  };
}

export function runWhenVerseElementReady(
  verse: number,
  onReady: (cleanup: (() => void) | null) => void,
  options: VerseJumpOptions = {},
): () => void {
  let attempts = 0;
  let cancelled = false;
  let frameId = 0;

  const run = () => {
    if (cancelled) return;

    const cleanup = highlightAndScrollToVerse(verse, options);
    if (cleanup) {
      onReady(cleanup);
      return;
    }

    if (++attempts < MAX_ATTEMPTS) {
      frameId = window.requestAnimationFrame(run);
    }
  };

  run();

  return () => {
    cancelled = true;
    window.cancelAnimationFrame(frameId);
  };
}
