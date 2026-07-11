"use client";

interface KoreanVerseTextProps {
  text: string;
  onSelect?: () => void;
}

export function KoreanVerseText({ text, onSelect }: KoreanVerseTextProps) {
  if (!onSelect) {
    return <span>{text}</span>;
  }

  const handleClick = () => {
    onSelect();
  };

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleClick();
        }
      }}
      className="cursor-pointer rounded-sm transition-colors hover:bg-amber-50/80"
    >
      {text}
    </span>
  );
}
