"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { BibleSearchButton } from "@/components/BibleSearch";

function navLinkClassName(active: boolean) {
  return `rounded-lg px-3 py-1.5 text-sm font-bold transition-colors ${
    active
      ? "bg-amber-800 text-white"
      : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
  }`;
}

export function HeaderNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isBasics = pathname === "/" && searchParams.get("view") === "basics";
  const isBooks = pathname === "/books" || pathname.startsWith("/read/");

  return (
    <nav className="flex items-center gap-1">
      <Link href="/?view=basics" className={navLinkClassName(isBasics)}>
        길잡이
      </Link>
      <Link href="/books" className={navLinkClassName(isBooks)}>
        성경
      </Link>
      <BibleSearchButton />
    </nav>
  );
}
