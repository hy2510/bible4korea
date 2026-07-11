"use client";

import {
  createContext,
  useCallback,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  getReadingFontSizeSnapshot,
  getServerReadingFontSizeSnapshot,
  saveReadingFontSize,
  subscribeReadingFontSize,
  type ReadingFontSize,
} from "@/lib/reading-font-size";

interface ReadingFontSizeContextValue {
  readingFontSize: ReadingFontSize;
  setReadingFontSize: (size: ReadingFontSize) => void;
}

const ReadingFontSizeContext =
  createContext<ReadingFontSizeContextValue | null>(null);

export function ReadingFontSizeProvider({ children }: { children: ReactNode }) {
  const readingFontSize = useSyncExternalStore(
    subscribeReadingFontSize,
    getReadingFontSizeSnapshot,
    getServerReadingFontSizeSnapshot,
  );

  const setReadingFontSize = useCallback((size: ReadingFontSize) => {
    saveReadingFontSize(size);
  }, []);

  return (
    <ReadingFontSizeContext.Provider
      value={{ readingFontSize, setReadingFontSize }}
    >
      {children}
    </ReadingFontSizeContext.Provider>
  );
}

export function useReadingFontSize() {
  const context = useContext(ReadingFontSizeContext);
  if (!context) {
    throw new Error(
      "useReadingFontSize must be used within ReadingFontSizeProvider",
    );
  }
  return context;
}
