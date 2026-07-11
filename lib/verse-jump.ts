const HIGHLIGHT_DURATION_MS = 2000;
const MAX_ATTEMPTS = 60;

export interface VerseJumpOptions {
  behavior?: ScrollBehavior;
}

function clearVerseHighlight(target: HTMLElement) {
  target.style.removeProperty("background-color");
  target.style.removeProperty("border-color");
  target.style.removeProperty("box-shadow");
  target.style.removeProperty("transition");
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

  target.style.transition =
    "background-color 0.5s ease, border-color 0.5s ease, box-shadow 0.5s ease";
  target.style.backgroundColor = "rgb(255 251 235 / 0.95)";
  target.style.borderColor = "rgb(251 191 36 / 0.7)";
  target.style.boxShadow = "0 0 0 3px rgb(251 191 36 / 0.25)";

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
