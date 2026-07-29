"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronUpIcon } from "@/components/ChevronIcons";
import { SAFE_AREA } from "@/lib/safe-area";

const SCROLL_THRESHOLD = 200;

export function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);
  const visibleRef = useRef(false);

  useEffect(() => {
    let frameId = 0;

    const onScroll = () => {
      if (frameId) return;

      frameId = window.requestAnimationFrame(() => {
        frameId = 0;
        const nextVisible = window.scrollY > SCROLL_THRESHOLD;
        if (nextVisible === visibleRef.current) return;

        visibleRef.current = nextVisible;
        setVisible(nextVisible);
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="맨 위로 가기"
      className={`fixed z-40 inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm font-medium text-stone-700 shadow-lg transition-colors hover:border-amber-300 hover:text-amber-900 dark:text-stone-300 ${SAFE_AREA.fixedBottom} ${SAFE_AREA.fixedRight}`}
    >
      <ChevronUpIcon />
      맨 위로
    </button>
  );
}
