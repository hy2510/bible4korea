"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { SiteLogo } from "@/components/SiteLogo";
import { featuredLabelLightTextClassName } from "@/lib/featured-panel";
import { SITE_NAME } from "@/lib/seo";

export function HeaderBrand() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isHome =
    pathname === "/" && searchParams.get("view") !== "basics";

  return (
    <Link
      href="/"
      aria-label={SITE_NAME}
      className={`group flex items-center rounded-lg transition-colors ${
        isHome
          ? ""
          : `${featuredLabelLightTextClassName} hover:text-amber-900 dark:text-stone-600 dark:hover:text-stone-900`
      }`}
    >
      <SiteLogo
        size={32}
        variant={isHome ? "filled" : "plain"}
        className="h-8 w-8 shrink-0"
      />
    </Link>
  );
}
